import { Effect, Scope } from "effect";
import {
  addAssets,
  assetsToValue,
  coreToTxOutput,
  toScriptRef,
  valueToAssets,
} from "@lucid-evolution/utils";
import { Address, Assets, Script } from "@lucid-evolution/core-types";
import { OutputDatum } from "../types.js";
import * as TxBuilder from "../TxBuilder.js";
import { CML } from "../../core.js";
import { toCMLAddress } from "./TxUtils.js";
import { ERROR_MESSAGE, TxBuilderError } from "../../Errors.js";
import { TxConfig } from "./Service.js";

export const payError = (cause: unknown) =>
  new TxBuilderError({ cause: `{ Pay: ${cause} }` });

/** Pay to a public key or native script address. */
export const payToAddress = (
  // config: TxBuilder.TxBuilderConfig,
  address: Address,
  assets: Assets,
) =>
  Effect.gen(function* () {
    const { config } = yield* TxConfig;
    const outputBuilder = CML.TransactionOutputBuilder.new()
      .with_address(yield* toCMLAddress(address, config.lucidConfig))
      .next();

    if (Object.keys(assets).length == 0)
      yield* payError(ERROR_MESSAGE.EMPTY_ASSETS);

    const value = assetsToValue(assets);
    let outputResult = outputBuilder
      .with_asset_and_min_required_coin(
        value.multi_asset(),
        config.lucidConfig.protocolParameters.coinsPerUtxoByte,
      )
      .build();

    const setLovelaces = assets["lovelace"];
    if (setLovelaces) {
      const minLovelace = outputResult.output().amount().coin();
      if (setLovelaces > minLovelace) {
        outputResult = outputBuilder.with_value(value).build();
      }
    }
    // Keep track of actual total output value
    config.totalOutputAssets = addAssets(
      config.totalOutputAssets,
      valueToAssets(outputResult.output().amount()),
    );
    config.payToOutputs = [
      ...config.payToOutputs,
      coreToTxOutput(outputResult.output()),
    ];
    config.txBuilder.add_output(outputResult);
  });

/** Pay to a public key or native script address with datum or scriptRef. */
export const payToAddressWithData = (
  address: Address,
  outputDatum: OutputDatum,
  assets?: Assets,
  scriptRef?: Script,
) =>
  Effect.gen(function* () {
    const { config } = yield* TxConfig;
    //TODO: Test with datumhash
    const outputBuilder = buildBaseOutput(address, outputDatum, scriptRef);

    assets ??= {};
    const value = assetsToValue(assets);
    let outputResult = outputBuilder
      .with_asset_and_min_required_coin(
        value.multi_asset(),
        config.lucidConfig.protocolParameters.coinsPerUtxoByte,
      )
      .build();

    const setLovelaces = assets["lovelace"];
    if (setLovelaces) {
      const minLovelace = outputResult.output().amount().coin();
      if (setLovelaces > minLovelace) {
        outputResult = outputBuilder.with_value(value).build();
      }
    }
    // Keep track of actual total output value
    config.totalOutputAssets = addAssets(
      config.totalOutputAssets,
      valueToAssets(outputResult.output().amount()),
    );
    config.payToOutputs = [
      ...config.payToOutputs,
      coreToTxOutput(outputResult.output()),
    ];
    config.txBuilder.add_output(outputResult);
  });

/** Pay to a plutus script address with datum or scriptRef. */
export const payToContract = (
  address: Address,
  outputDatum: OutputDatum,
  assets?: Assets,
  scriptRef?: Script,
) =>
  Effect.gen(function* () {
    if (!outputDatum.value) yield* payError(ERROR_MESSAGE.DATUM_NOT_SET);
    return yield* payToAddressWithData(address, outputDatum, assets, scriptRef);
  });

const buildBaseOutput = (
  address: Address,
  outputDatum: OutputDatum,
  scriptRef: Script | undefined,
) => {
  let baseBuilder: CML.TransactionOutputBuilder;
  const addressBuilder = CML.TransactionOutputBuilder.new().with_address(
    CML.Address.from_bech32(address),
  );

  switch (outputDatum.kind) {
    case "hash": {
      const datumOption = CML.DatumOption.new_hash(
        CML.DatumHash.from_hex(outputDatum.value),
      );
      baseBuilder = addressBuilder.with_data(datumOption);
      break;
    }
    case "asHash": {
      const plutusData = CML.PlutusData.from_cbor_hex(outputDatum.value);
      baseBuilder = addressBuilder.with_communication_data(plutusData);
      break;
    }
    case "inline": {
      const plutusData = CML.PlutusData.from_cbor_hex(outputDatum.value);
      const datumOption = CML.DatumOption.new_datum(plutusData);
      baseBuilder = addressBuilder.with_data(datumOption);
      break;
    }
    default:
      throw new Error(`Unknown outputDatum: ${outputDatum}`);
  }

  return scriptRef
    ? baseBuilder.with_reference_script(toScriptRef(scriptRef)).next()
    : baseBuilder.next();
};
