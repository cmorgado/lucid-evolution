import {
  Effect,
  pipe,
  Record,
  Array as _Array,
  BigInt as _BigInt,
  Tuple,
  Console,
  Option,
} from "effect";
import { Address, Assets, UTxO, Wallet } from "@lucid-evolution/core-types";
import {
  ERROR_MESSAGE,
  RunTimeError,
  TxBuilderError,
  TxBuilderErrorCause,
} from "../../Errors.js";
import { CML } from "../../core.js";
import * as UPLC from "@lucid-evolution/uplc";
import * as TxBuilder from "../TxBuilder.js";
import * as TxSignBuilder from "../../tx-sign-builder/TxSignBuilder.js";
import {
  assetsToValue,
  coreToTxOutput,
  isEqualUTxO,
  selectUTxOs,
  sortUTxOs,
  stringify,
  utxoToCore,
  utxoToTransactionInput,
  utxoToTransactionOutput,
} from "@lucid-evolution/utils";
import { SLOT_CONFIG_NETWORK } from "@lucid-evolution/plutus";

export type CompleteOptions = {
  coinSelection?: boolean;
  changeAddress?: Address;
  localUPLCEval?: boolean; // replaces nativeUPLC
};

export const completeTxError = (cause: TxBuilderErrorCause, message?: string) =>
  new TxBuilderError({ cause, module: "Complete", message });

type WalletInfo = {
  wallet: Wallet;
  address: string;
  inputs: UTxO[];
};

const getWalletInfo = (
  config: TxBuilder.TxBuilderConfig,
): Effect.Effect<WalletInfo, TxBuilderError, never> =>
  Effect.gen(function* () {
    const wallet: Wallet = yield* pipe(
      Effect.fromNullable(config.lucidConfig.wallet),
      Effect.orElseFail(() =>
        completeTxError("MissingWallet", ERROR_MESSAGE.MISSING_WALLET),
      ),
    );
    const address: Address = yield* Effect.promise(() => wallet.address());
    const inputs: UTxO[] = yield* pipe(
      Effect.tryPromise({
        try: () => wallet.getUtxos(),
        catch: (error) => completeTxError("Provider", String(error)),
      }),
    );
    const walletInputs = _Array.isEmptyArray(config.walletInputs)
      ? inputs
      : config.walletInputs;

    return {
      wallet,
      address,
      inputs: walletInputs,
    };
  });

export const complete = (
  config: TxBuilder.TxBuilderConfig,
  options: CompleteOptions = { coinSelection: true, localUPLCEval: true },
) =>
  Effect.gen(function* () {
    yield* Effect.all(config.programs, { concurrency: "unbounded" });
    const walletInfo = yield* getWalletInfo(config);

    // Set collateral input if there are script executions
    if (config.scripts.size > 0) {
      const collateralInput = yield* findCollateral(
        config.lucidConfig.protocolParameters.coinsPerUtxoByte,
        walletInfo.inputs,
      );
      setCollateral(config, collateralInput, walletInfo.address);
    }

    console.log("Phase 1");
    yield* selectionAndEvaluation(config, options, walletInfo, false);

    console.log("Phase 2");
    yield* selectionAndEvaluation(config, options, walletInfo, true);

    // const availableInputs = _Array.differenceWith(isEqualUTxO)(
    //   walletInfo.inputs,
    //   config.collectedInputs,
    // );

    // const inputsToAdd =
    //   options.coinSelection !== false
    //     ? yield* coinSelection(config, availableInputs)
    //     : [];

    // for (const utxo of inputsToAdd) {
    //   const input = CML.SingleInputBuilder.from_transaction_unspent_output(
    //     utxoToCore(utxo),
    //   ).payment_key();
    //   config.txBuilder.add_input(input);
    // }
    // //NOTE: We need to keep track of all consumed inputs
    // // this is just a patch, and we should find a better way to do this
    // config.consumedInputs = [...config.collectedInputs, ...inputsToAdd];

    // const txRedeemerBuilder = config.txBuilder.build_for_evaluation(
    //   0,
    //   CML.Address.from_bech32(walletInfo.address),
    // );
    // if (
    //   options.localUPLCEval !== false &&
    //   txRedeemerBuilder.draft_tx().witness_set().redeemers()
    // ) {
    //   applyUPLCEval(
    //     yield* evalTransaction(config, txRedeemerBuilder, walletInfo.inputs),
    //     config.txBuilder,
    //   );
    // }
    config.txBuilder.add_change_if_needed(
      CML.Address.from_bech32(walletInfo.address),
      true,
    );
    const tx = config.txBuilder
      .build(
        CML.ChangeSelectionAlgo.Default,
        CML.Address.from_bech32(walletInfo.address),
      )
      .build_unchecked();

    // yield* Console.log("Transaction: ", tx.body().to_json());

    const derivedInputs = deriveInputsFromTransaction(tx);

    const derivedWalletInputs = derivedInputs.filter(
      (utxo) => utxo.address === walletInfo.address,
    );
    const updatedWalletInputs = pipe(
      _Array.differenceWith(isEqualUTxO)(
        walletInfo.inputs,
        config.consumedInputs,
      ),
      (availableWalletInputs) => [
        ...derivedWalletInputs,
        ...availableWalletInputs,
      ],
    );

    return Tuple.make(
      updatedWalletInputs,
      derivedInputs,
      TxSignBuilder.makeTxSignBuilder(config.lucidConfig, tx),
    );
  }).pipe(
    Effect.catchAllDefect(
      (e) => new RunTimeError({ message: stringify(String(e)) }),
    ),
  );

export const selectionAndEvaluation = (
  config: TxBuilder.TxBuilderConfig,
  options: CompleteOptions,
  walletInfo: WalletInfo,
  script_calculation: Boolean
) =>
  Effect.gen(function* () {
    const availableInputs = _Array.differenceWith(isEqualUTxO)(
      walletInfo.inputs,
      config.collectedInputs,
    );

    const inputsToAdd =
      options.coinSelection !== false
        ? yield* coinSelection(config, availableInputs, script_calculation)
        : [];
    config.collectedInputs = [...config.collectedInputs, ...inputsToAdd];

    for (const utxo of inputsToAdd) {
      const input = CML.SingleInputBuilder.from_transaction_unspent_output(
        utxoToCore(utxo),
      ).payment_key();
      config.txBuilder.add_input(input);
    }
    //NOTE: We need to keep track of all consumed inputs
    // this is just a patch, and we should find a better way to do this
    config.consumedInputs = [...config.collectedInputs, ...inputsToAdd];

    const txRedeemerBuilder = config.txBuilder.build_for_evaluation(
      0,
      CML.Address.from_bech32(walletInfo.address),
    );
    if (
      options.localUPLCEval !== false &&
      txRedeemerBuilder.draft_tx().witness_set().redeemers()
    ) {
      applyUPLCEval(
        yield* evalTransaction(config, txRedeemerBuilder, walletInfo.inputs),
        config.txBuilder,
      );
    }
  }).pipe(
    Effect.catchAllDefect(
      (e) => new RunTimeError({ message: stringify(String(e)) }),
    ),
  );

export const applyUPLCEval = (
  uplcEval: Uint8Array[],
  txbuilder: CML.TransactionBuilder,
) => {
  console.log("In applyUPLCEval");
  for (const bytes of uplcEval) {
    const redeemer = CML.LegacyRedeemer.from_cbor_bytes(bytes);
    const exUnits = CML.ExUnits.new(
      redeemer.ex_units().mem(),
      redeemer.ex_units().steps(),
    );
    // console.log(redeemer.to_json());
    txbuilder.set_exunits(
      CML.RedeemerWitnessKey.new(redeemer.tag(), redeemer.index()),
      exUnits,
    );
  }
};

export const setRedeemerstoZero = (tx: CML.Transaction) => {
  const redeemers = tx.witness_set().redeemers();
  if (redeemers) {
    const redeemerList = CML.LegacyRedeemerList.new();
    for (let i = 0; i < redeemers.as_arr_legacy_redeemer()!.len(); i++) {
      const redeemer = redeemers.as_arr_legacy_redeemer()!.get(i);
      const dummyRedeemer = CML.LegacyRedeemer.new(
        redeemer.tag(),
        redeemer.index(),
        redeemer.data(),
        CML.ExUnits.new(0n, 0n),
      );
      redeemerList.add(dummyRedeemer);
    }
    const dummyWitnessSet = tx.witness_set();
    dummyWitnessSet.set_redeemers(
      CML.Redeemers.new_arr_legacy_redeemer(redeemerList),
    );
    return CML.Transaction.new(
      tx.body(),
      dummyWitnessSet,
      true,
      tx.auxiliary_data(),
    );
  }
};

const setCollateral = (
  config: TxBuilder.TxBuilderConfig,
  collateralInputs: UTxO[],
  changeAddress: string,
) => {
  for (const utxo of collateralInputs) {
    const collateralInput =
      CML.SingleInputBuilder.from_transaction_unspent_output(
        utxoToCore(utxo),
      ).payment_key();
    config.txBuilder.add_collateral(collateralInput);
  }
  const returnassets = pipe(
    sumAssetsFromInputs(collateralInputs),
    Record.union({ lovelace: -5_000_000n }, _BigInt.sum),
  );

  const collateralOutputBuilder =
    CML.TransactionOutputBuilder.new().with_address(
      CML.Address.from_bech32(changeAddress),
    );
  config.txBuilder.set_collateral_return(
    collateralOutputBuilder
      .next()
      .with_value(assetsToValue(returnassets))
      .build()
      .output(),
  );
};

const findCollateral = (
  coinsPerUtxoByte: bigint,
  inputs: UTxO[],
): Effect.Effect<UTxO[], TxBuilderError, never> =>
  Effect.gen(function* () {
    // NOTE: While the required collateral is 5 ADA, there may be instances where the UTXOs encountered do not contain enough ADA to be returned to the collateral return address.
    // For example:
    // A UTXO with 5.5 ADA will result in an error message such as `BabbageOutputTooSmallUTxO`, since only 0.5 ADA would be returned to the collateral return address.
    const minLovelaceChangeAddress: Assets = {
      lovelace: calculateMinLovelace(coinsPerUtxoByte),
    };
    const collateralLovelace: Assets = { lovelace: 5_000_000n };
    const requiredAssets = Record.union(
      minLovelaceChangeAddress,
      collateralLovelace,
      _BigInt.sum,
    );
    // const selected = selectUTxOs(sortUTxOs(inputs), requiredAssets);
    const selected = recursive(
      sortUTxOs(inputs),
      collateralLovelace,
      coinsPerUtxoByte,
    );

    if (_Array.isEmptyArray(selected))
      yield* completeTxError(
        "MissingCollateral",
        `Your wallet does not have enough funds to cover the required 5 ADA collateral.`,
      );
    if (selected.length > 3)
      yield* completeTxError(
        "MissingCollateral",
        `Selected ${selected.length} inputs as collateral, but max collateral inputs is 3 to cover the 5 ADA collateral ${stringify(selected)}`,
      );
    return selected;
  });

const coinSelection = (
  config: TxBuilder.TxBuilderConfig,
  availableInputs: UTxO[],
  script_calculation: Boolean
): Effect.Effect<UTxO[], TxBuilderError> =>
  Effect.gen(function* () {
    // yield* Console.log("config.collectedInputs: ", config.collectedInputs);
    // NOTE: This is a fee estimation. If the amount is not enough, it may require increasing the fee.
    const estimatedFee1: Assets = { lovelace: config.txBuilder.min_fee(false) };
    const estimatedLovelaceChangeAddress: Assets = { lovelace: 3_000_000n };
    const negatedMintedAssets = negateAssets(config.mintedAssets);
    const negatedCollectedAssets = negateAssets(
      sumAssetsFromInputs(config.collectedInputs));

    console.log(stringify(estimatedFee1));
    
    const estimatedFee: Assets = script_calculation ? { lovelace: config.txBuilder.min_fee(true)} : estimatedFee1
    console.log("Fee with exUnits " + script_calculation);
    console.log(stringify(estimatedFee));

    // Calculate the net change in assets (delta)
    const assetsDelta: Assets = pipe(
      config.totalOutputAssets,
      Record.union(estimatedFee, _BigInt.sum),
      Record.union(negatedCollectedAssets, _BigInt.sum),
      Record.union(negatedMintedAssets, _BigInt.sum),
    );
    // Filter and obtain only the required assets (those with a positive amount)
    const requiredAssets = pipe(
      assetsDelta,
      Record.filter((amount) => amount > 0n),
    );
    // TODO: add missing check on leftover assets containing minAda when collected inputs are sufficient.
    // No UTxOs need to be selected if collected inputs are sufficient
    if (Record.isEmptyRecord(requiredAssets)) return [];
    // yield* Console.log("requiredAssets: ", requiredAssets);
    // Filter and obtain assets that are present in the inputs and mints but are not required by the outputs
    // Negate these assets to get their positive amounts
    const notRequiredAssets = pipe(
      assetsDelta,
      Record.filter((amount) => amount < 0n),
      negateAssets,
    );
    const selected = recursive(
      sortUTxOs(availableInputs),
      requiredAssets,
      config.lucidConfig.protocolParameters.coinsPerUtxoByte,
      notRequiredAssets,
    );
    // yield* Console.log("selected: ", stringify(selected));
    if (_Array.isEmptyArray(selected))
      yield* completeTxError(
        "NotFound",
        `Your wallet does not have enough funds to cover the required assets. ${stringify(requiredAssets)}`,
      );
    return selected;
  });

// const coinSelection = (
//   config: TxBuilder.TxBuilderConfig,
//   availableInputs: UTxO[],
// ): Effect.Effect<UTxO[], TxBuilderError> =>
//   Effect.gen(function* () {
//     // NOTE: This is a fee estimation. If the amount is not enough, it may require increasing the fee.
//     const estimatedFee: Assets = { lovelace: config.txBuilder.min_fee(false) };
//     const negatedMintedAssets = negateAssets(config.mintedAssets);
//     const negatedCollectedAssets = negateAssets(
//       sumAssetsFromInputs(config.collectedInputs),
//     );
//     // Calculate the net change in assets (delta)
//     const assetsDelta: Assets = pipe(
//       config.totalOutputAssets,
//       Record.union(estimatedFee, _BigInt.sum),
//       Record.union(negatedCollectedAssets, _BigInt.sum),
//       Record.union(negatedMintedAssets, _BigInt.sum),
//     );
//     // Filter and obtain only the required assets (those with a positive amount)
//     const requiredAssets: Option.Option<Assets> = pipe(
//       assetsDelta,
//       Record.filter((amount) => amount > 0n),
//       (d) => (Record.isEmptyRecord(d) ? Option.none() : Option.some(d)),
//     );
//     // Filter and obtain assets that are present in the inputs and mints but are not required by the outputs
//     // Negate these assets to get their positive amounts
//     const notRequiredAssets: Option.Option<Assets> = pipe(
//       assetsDelta,
//       Record.filter((amount) => amount < 0n),
//       negateAssets,
//       (d) => (Record.isEmptyRecord(d) ? Option.none() : Option.some(d)),
//     );
//     const selectedInputs: Option.Option<UTxO[]> = pipe(
//       requiredAssets,
//       Option.map((a) => selectUTxOs(sortUTxOs(availableInputs), a)),
//       Option.flatMap((utxos) =>
//         _Array.isEmptyArray(utxos) ? Option.none() : Option.some(utxos),
//       ),
//     );
//     const selectedAssets: Option.Option<Assets> = pipe(
//       selectedInputs,
//       Option.map(sumAssetsFromInputs),
//     );
//     //Calculate the leftover assets, so we can calculate the real min ada going back to the change address
//     const leftoverAssets: Option.Option<Assets> = pipe(
//       Option.all([selectedAssets, requiredAssets, notRequiredAssets]),
//       Option.map(([selectedAssets, requiredAssets, notRequiredAssets]) =>
//         pipe(
//           selectedAssets,
//           Record.union(requiredAssets, (self, that) => self - that),
//           Record.union(notRequiredAssets, (self, that) => self + that),
//         ),
//       ),
//     );
//     // Ensure the leftover ADA (Lovelace) sent back to the change address meets the minimum required ADA.
//     // In some cases, the leftover Lovelace may be insufficient because the minimum required ADA can be greater than the available leftover Lovelace.
//     const extraLovelace: Option.Option<Assets> = pipe(
//       leftoverAssets,
//       Option.flatMap((leftoverAssets) => {
//         const minLovelace = calculateMinLovelace(
//           config.lucidConfig.protocolParameters.coinsPerUtxoByte,
//           leftoverAssets,
//         );
//         if (leftoverAssets["lovelace"] > minLovelace) {
//           return Option.none();
//         } else {
//           return Option.some({
//             lovelace: minLovelace - leftoverAssets["lovelace"],
//           });
//         }
//       }),
//     );
//     // Combine all required assets into a single record
//     const allRequiredAssets: Assets = Record.union(
//       Option.getOrElse(requiredAssets, () => Record.empty()),
//       Option.getOrElse(extraLovelace, () => Record.empty()),
//       _BigInt.sum,
//     );
//     // If no assets are required, return an empty array
//     if (Record.isEmptyRecord(allRequiredAssets)) return [];
//     // Select UTxOs that match the total required assets
//     const selected = selectUTxOs(sortUTxOs(availableInputs), allRequiredAssets);
//     if (_Array.isEmptyArray(selected))
//       yield* completeTxError(
//         "NotFound",
//         `Your wallet does not have enough funds to cover the required assets. ${stringify(allRequiredAssets)}`,
//       );
//     return selected;
//   });

const evalTransaction = (
  config: TxBuilder.TxBuilderConfig,
  txRedeemerBuilder: CML.TxRedeemerBuilder,
  walletInputs: UTxO[],
): Effect.Effect<Uint8Array[], TxBuilderError> =>
  Effect.gen(function* () {
    //FIX: this returns undefined
    const txEvaluation = setRedeemerstoZero(txRedeemerBuilder.draft_tx())!;
    // console.log(txEvaluation?.to_json());
    const txUtxos = [
      ...walletInputs,
      ...config.collectedInputs,
      ...config.readInputs,
    ];
    const ins = txUtxos.map((utxo) => utxoToTransactionInput(utxo));
    const outs = txUtxos.map((utxo) => utxoToTransactionOutput(utxo));
    const slotConfig = SLOT_CONFIG_NETWORK[config.lucidConfig.network];
    const uplc_eval = yield* Effect.try({
      try: () =>
        UPLC.eval_phase_two_raw(
          txEvaluation.to_cbor_bytes(),
          ins.map((value) => value.to_cbor_bytes()),
          outs.map((value) => value.to_cbor_bytes()),
          config.lucidConfig.costModels.to_cbor_bytes(),
          config.lucidConfig.protocolParameters.maxTxExSteps,
          config.lucidConfig.protocolParameters.maxTxExMem,
          BigInt(slotConfig.zeroTime),
          BigInt(slotConfig.zeroSlot),
          slotConfig.slotLength,
        ),
      catch: (error) =>
        //TODO: improve format
        completeTxError("UPLCEval", JSON.stringify(error).replace(/\\n/g, "")),
    });
    return uplc_eval;
  });

const calculateMinLovelace = (
  coinsPerUtxoByte: bigint,
  multiAssets?: Assets,
  changeAddress?: string,
) => {
  const dummyAddress =
    "addr_test1qrngfyc452vy4twdrepdjc50d4kvqutgt0hs9w6j2qhcdjfx0gpv7rsrjtxv97rplyz3ymyaqdwqa635zrcdena94ljs0xy950";
  return CML.TransactionOutputBuilder.new()
    .with_address(
      CML.Address.from_bech32(changeAddress ? changeAddress : dummyAddress),
    )
    .next()
    .with_asset_and_min_required_coin(
      multiAssets
        ? assetsToValue(multiAssets).multi_asset()
        : CML.MultiAsset.new(),
      coinsPerUtxoByte,
    )
    .build()
    .output()
    .amount()
    .coin();
};

const deriveInputsFromTransaction = (tx: CML.Transaction) => {
  const outputs = tx.body().outputs();
  const txHash = CML.hash_transaction(tx.body()).to_hex();
  const utxos: UTxO[] = [];
  for (let index = 0; index < outputs.len(); index++) {
    const output = outputs.get(index);
    const utxo: UTxO = {
      txHash: txHash,
      outputIndex: index,
      ...coreToTxOutput(output),
    };
    utxos.push(utxo);
  }
  return utxos;
};

/**
 * Returns a new `Assets`
 *
 * Negates the amounts of all assets in the given record.
 */
const negateAssets = (assets: Assets): Assets =>
  Record.map(assets, (amount) => -amount);

/**
 * Returns a new Assets
 *
 * Sums the assets from an array of UTxO inputs.
 */
const sumAssetsFromInputs = (inputs: UTxO[]) =>
  _Array.isEmptyArray(inputs)
    ? {}
    : inputs
        .map((utxo) => utxo.assets)
        .reduce((acc, cur) => Record.union(acc, cur, _BigInt.sum));

const calculateExtraLovelace = (
  leftoverAssets: Assets,
  coinsPerUtxoByte: bigint,
): Option.Option<Assets> => {
  return pipe(leftoverAssets, (assets) => {
    const minLovelace = calculateMinLovelace(coinsPerUtxoByte, assets);
    const currentLovelace = assets["lovelace"] || 0n;
    return currentLovelace >= minLovelace
      ? Option.none()
      : Option.some({ lovelace: minLovelace - currentLovelace });
  });
};

export const recursive = (
  inputs: UTxO[],
  requiredAssets: Assets,
  coinsPerUtxoByte: bigint,
  externalAssets: Assets = {},
): UTxO[] => {
  let selected = selectUTxOs(inputs, requiredAssets);
  if (_Array.isEmptyArray(selected)) return [];
  const selectedAssets: Assets = sumAssetsFromInputs(selected);
  let availableAssets: Assets = pipe(
    selectedAssets,
    Record.union(requiredAssets, (self, that) => self - that),
    Record.union(externalAssets, _BigInt.sum),
  );

  let extraLovelace: Assets | undefined = pipe(
    calculateExtraLovelace(availableAssets, coinsPerUtxoByte),
    Option.getOrUndefined,
  );
  let remainingInputs: UTxO[] = _Array.differenceWith(isEqualUTxO)(
    inputs,
    selected,
  );
  while (extraLovelace) {
    const extraSelected = selectUTxOs(remainingInputs, extraLovelace);
    if (_Array.isEmptyArray(extraSelected)) {
      return [];
    }
    const extraSelectedAssets: Assets = sumAssetsFromInputs(extraSelected);
    selected = [...selected, ...extraSelected];
    availableAssets = Record.union(
      availableAssets,
      extraSelectedAssets,
      _BigInt.sum,
    );

    extraLovelace = pipe(
      calculateExtraLovelace(availableAssets, coinsPerUtxoByte),
      Option.getOrUndefined,
    );
    remainingInputs = _Array.differenceWith(isEqualUTxO)(
      remainingInputs,
      selected,
    );
  }
  return selected;
};
