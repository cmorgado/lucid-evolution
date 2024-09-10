import { CML } from "./core.js";
import { CostModels, ProtocolParameters } from "@lucid-evolution/core-types";

type Cost = Record<number, number[] | null>;

export function createCostModels(costModels: CostModels): CML.CostModels {
  const costmodel: Cost = {
    0: [],
    1: [],
    2: [],
  };
  // add plutus v1
  for (const cost of Object.values(costModels.PlutusV1)) {
    costmodel[0]?.push(cost);
  }

  // add plutus v2
  for (const cost of Object.values(costModels.PlutusV2)) {
    costmodel[1]?.push(cost);
  }

  // add plutus v3
  for (const cost of Object.values(costModels.PlutusV3)) {
    costmodel[2]?.push(cost);
  }

  return CML.CostModels.from_json(JSON.stringify(costmodel));
}

export const PROTOCOL_PARAMETERS_DEFAULT: ProtocolParameters = {
  minFeeA: 44,
  minFeeB: 155381,
  maxTxSize: 16384,
  maxValSize: 5000,
  keyDeposit: 2000000n,
  poolDeposit: 500000000n,
  priceMem: 0.0577,
  priceStep: 0.0000721,
  maxTxExMem: 14000000n,
  maxTxExSteps: 10000000000n,
  coinsPerUtxoByte: 4310n,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  minFeeRefScriptCostPerByte: 15,
  costModels: {
    PlutusV1: {
      "0": 100788,
      "1": 420,
      "2": 1,
      "3": 1,
      "4": 1000,
      "5": 173,
      "6": 0,
      "7": 1,
      "8": 1000,
      "9": 59957,
      "10": 4,
      "11": 1,
      "12": 11183,
      "13": 32,
      "14": 201305,
      "15": 8356,
      "16": 4,
      "17": 16000,
      "18": 100,
      "19": 16000,
      "20": 100,
      "21": 16000,
      "22": 100,
      "23": 16000,
      "24": 100,
      "25": 16000,
      "26": 100,
      "27": 16000,
      "28": 100,
      "29": 100,
      "30": 100,
      "31": 16000,
      "32": 100,
      "33": 94375,
      "34": 32,
      "35": 132994,
      "36": 32,
      "37": 61462,
      "38": 4,
      "39": 72010,
      "40": 178,
      "41": 0,
      "42": 1,
      "43": 22151,
      "44": 32,
      "45": 91189,
      "46": 769,
      "47": 4,
      "48": 2,
      "49": 85848,
      "50": 228465,
      "51": 122,
      "52": 0,
      "53": 1,
      "54": 1,
      "55": 1000,
      "56": 42921,
      "57": 4,
      "58": 2,
      "59": 24548,
      "60": 29498,
      "61": 38,
      "62": 1,
      "63": 898148,
      "64": 27279,
      "65": 1,
      "66": 51775,
      "67": 558,
      "68": 1,
      "69": 39184,
      "70": 1000,
      "71": 60594,
      "72": 1,
      "73": 141895,
      "74": 32,
      "75": 83150,
      "76": 32,
      "77": 15299,
      "78": 32,
      "79": 76049,
      "80": 1,
      "81": 13169,
      "82": 4,
      "83": 22100,
      "84": 10,
      "85": 28999,
      "86": 74,
      "87": 1,
      "88": 28999,
      "89": 74,
      "90": 1,
      "91": 43285,
      "92": 552,
      "93": 1,
      "94": 44749,
      "95": 541,
      "96": 1,
      "97": 33852,
      "98": 32,
      "99": 68246,
      "100": 32,
      "101": 72362,
      "102": 32,
      "103": 7243,
      "104": 32,
      "105": 7391,
      "106": 32,
      "107": 11546,
      "108": 32,
      "109": 85848,
      "110": 228465,
      "111": 122,
      "112": 0,
      "113": 1,
      "114": 1,
      "115": 90434,
      "116": 519,
      "117": 0,
      "118": 1,
      "119": 74433,
      "120": 32,
      "121": 85848,
      "122": 228465,
      "123": 122,
      "124": 0,
      "125": 1,
      "126": 1,
      "127": 85848,
      "128": 228465,
      "129": 122,
      "130": 0,
      "131": 1,
      "132": 1,
      "133": 270652,
      "134": 22588,
      "135": 4,
      "136": 1457325,
      "137": 64566,
      "138": 4,
      "139": 20467,
      "140": 1,
      "141": 4,
      "142": 0,
      "143": 141992,
      "144": 32,
      "145": 100788,
      "146": 420,
      "147": 1,
      "148": 1,
      "149": 81663,
      "150": 32,
      "151": 59498,
      "152": 32,
      "153": 20142,
      "154": 32,
      "155": 24588,
      "156": 32,
      "157": 20744,
      "158": 32,
      "159": 25933,
      "160": 32,
      "161": 24623,
      "162": 32,
      "163": 53384111,
      "164": 14333,
      "165": 10,
    },
    PlutusV2: {
      "0": 100788,
      "1": 420,
      "2": 1,
      "3": 1,
      "4": 1000,
      "5": 173,
      "6": 0,
      "7": 1,
      "8": 1000,
      "9": 59957,
      "10": 4,
      "11": 1,
      "12": 11183,
      "13": 32,
      "14": 201305,
      "15": 8356,
      "16": 4,
      "17": 16000,
      "18": 100,
      "19": 16000,
      "20": 100,
      "21": 16000,
      "22": 100,
      "23": 16000,
      "24": 100,
      "25": 16000,
      "26": 100,
      "27": 16000,
      "28": 100,
      "29": 100,
      "30": 100,
      "31": 16000,
      "32": 100,
      "33": 94375,
      "34": 32,
      "35": 132994,
      "36": 32,
      "37": 61462,
      "38": 4,
      "39": 72010,
      "40": 178,
      "41": 0,
      "42": 1,
      "43": 22151,
      "44": 32,
      "45": 91189,
      "46": 769,
      "47": 4,
      "48": 2,
      "49": 85848,
      "50": 228465,
      "51": 122,
      "52": 0,
      "53": 1,
      "54": 1,
      "55": 1000,
      "56": 42921,
      "57": 4,
      "58": 2,
      "59": 24548,
      "60": 29498,
      "61": 38,
      "62": 1,
      "63": 898148,
      "64": 27279,
      "65": 1,
      "66": 51775,
      "67": 558,
      "68": 1,
      "69": 39184,
      "70": 1000,
      "71": 60594,
      "72": 1,
      "73": 141895,
      "74": 32,
      "75": 83150,
      "76": 32,
      "77": 15299,
      "78": 32,
      "79": 76049,
      "80": 1,
      "81": 13169,
      "82": 4,
      "83": 22100,
      "84": 10,
      "85": 28999,
      "86": 74,
      "87": 1,
      "88": 28999,
      "89": 74,
      "90": 1,
      "91": 43285,
      "92": 552,
      "93": 1,
      "94": 44749,
      "95": 541,
      "96": 1,
      "97": 33852,
      "98": 32,
      "99": 68246,
      "100": 32,
      "101": 72362,
      "102": 32,
      "103": 7243,
      "104": 32,
      "105": 7391,
      "106": 32,
      "107": 11546,
      "108": 32,
      "109": 85848,
      "110": 228465,
      "111": 122,
      "112": 0,
      "113": 1,
      "114": 1,
      "115": 90434,
      "116": 519,
      "117": 0,
      "118": 1,
      "119": 74433,
      "120": 32,
      "121": 85848,
      "122": 228465,
      "123": 122,
      "124": 0,
      "125": 1,
      "126": 1,
      "127": 85848,
      "128": 228465,
      "129": 122,
      "130": 0,
      "131": 1,
      "132": 1,
      "133": 955506,
      "134": 213312,
      "135": 0,
      "136": 2,
      "137": 270652,
      "138": 22588,
      "139": 4,
      "140": 1457325,
      "141": 64566,
      "142": 4,
      "143": 20467,
      "144": 1,
      "145": 4,
      "146": 0,
      "147": 141992,
      "148": 32,
      "149": 100788,
      "150": 420,
      "151": 1,
      "152": 1,
      "153": 81663,
      "154": 32,
      "155": 59498,
      "156": 32,
      "157": 20142,
      "158": 32,
      "159": 24588,
      "160": 32,
      "161": 20744,
      "162": 32,
      "163": 25933,
      "164": 32,
      "165": 24623,
      "166": 32,
      "167": 43053543,
      "168": 10,
      "169": 53384111,
      "170": 14333,
      "171": 10,
      "172": 43574283,
      "173": 26308,
      "174": 10,
    },
    PlutusV3: {
      "0": 100788,
      "1": 420,
      "2": 1,
      "3": 1,
      "4": 1000,
      "5": 173,
      "6": 0,
      "7": 1,
      "8": 1000,
      "9": 59957,
      "10": 4,
      "11": 1,
      "12": 11183,
      "13": 32,
      "14": 201305,
      "15": 8356,
      "16": 4,
      "17": 16000,
      "18": 100,
      "19": 16000,
      "20": 100,
      "21": 16000,
      "22": 100,
      "23": 16000,
      "24": 100,
      "25": 16000,
      "26": 100,
      "27": 16000,
      "28": 100,
      "29": 100,
      "30": 100,
      "31": 16000,
      "32": 100,
      "33": 94375,
      "34": 32,
      "35": 132994,
      "36": 32,
      "37": 61462,
      "38": 4,
      "39": 72010,
      "40": 178,
      "41": 0,
      "42": 1,
      "43": 22151,
      "44": 32,
      "45": 91189,
      "46": 769,
      "47": 4,
      "48": 2,
      "49": 85848,
      "50": 123203,
      "51": 7305,
      "52": -900,
      "53": 1716,
      "54": 549,
      "55": 57,
      "56": 85848,
      "57": 0,
      "58": 1,
      "59": 1,
      "60": 1000,
      "61": 42921,
      "62": 4,
      "63": 2,
      "64": 24548,
      "65": 29498,
      "66": 38,
      "67": 1,
      "68": 898148,
      "69": 27279,
      "70": 1,
      "71": 51775,
      "72": 558,
      "73": 1,
      "74": 39184,
      "75": 1000,
      "76": 60594,
      "77": 1,
      "78": 141895,
      "79": 32,
      "80": 83150,
      "81": 32,
      "82": 15299,
      "83": 32,
      "84": 76049,
      "85": 1,
      "86": 13169,
      "87": 4,
      "88": 22100,
      "89": 10,
      "90": 28999,
      "91": 74,
      "92": 1,
      "93": 28999,
      "94": 74,
      "95": 1,
      "96": 43285,
      "97": 552,
      "98": 1,
      "99": 44749,
      "100": 541,
      "101": 1,
      "102": 33852,
      "103": 32,
      "104": 68246,
      "105": 32,
      "106": 72362,
      "107": 32,
      "108": 7243,
      "109": 32,
      "110": 7391,
      "111": 32,
      "112": 11546,
      "113": 32,
      "114": 85848,
      "115": 123203,
      "116": 7305,
      "117": -900,
      "118": 1716,
      "119": 549,
      "120": 57,
      "121": 85848,
      "122": 0,
      "123": 1,
      "124": 90434,
      "125": 519,
      "126": 0,
      "127": 1,
      "128": 74433,
      "129": 32,
      "130": 85848,
      "131": 123203,
      "132": 7305,
      "133": -900,
      "134": 1716,
      "135": 549,
      "136": 57,
      "137": 85848,
      "138": 0,
      "139": 1,
      "140": 1,
      "141": 85848,
      "142": 123203,
      "143": 7305,
      "144": -900,
      "145": 1716,
      "146": 549,
      "147": 57,
      "148": 85848,
      "149": 0,
      "150": 1,
      "151": 955506,
      "152": 213312,
      "153": 0,
      "154": 2,
      "155": 270652,
      "156": 22588,
      "157": 4,
      "158": 1457325,
      "159": 64566,
      "160": 4,
      "161": 20467,
      "162": 1,
      "163": 4,
      "164": 0,
      "165": 141992,
      "166": 32,
      "167": 100788,
      "168": 420,
      "169": 1,
      "170": 1,
      "171": 81663,
      "172": 32,
      "173": 59498,
      "174": 32,
      "175": 20142,
      "176": 32,
      "177": 24588,
      "178": 32,
      "179": 20744,
      "180": 32,
      "181": 25933,
      "182": 32,
      "183": 24623,
      "184": 32,
      "185": 43053543,
      "186": 10,
      "187": 53384111,
      "188": 14333,
      "189": 10,
      "190": 43574283,
      "191": 26308,
      "192": 10,
      "193": 16000,
      "194": 100,
      "195": 16000,
      "196": 100,
      "197": 962335,
      "198": 18,
      "199": 2780678,
      "200": 6,
      "201": 442008,
      "202": 1,
      "203": 52538055,
      "204": 3756,
      "205": 18,
      "206": 267929,
      "207": 18,
      "208": 76433006,
      "209": 8868,
      "210": 18,
      "211": 52948122,
      "212": 18,
      "213": 1995836,
      "214": 36,
      "215": 3227919,
      "216": 12,
      "217": 901022,
      "218": 1,
      "219": 166917843,
      "220": 4307,
      "221": 36,
      "222": 284546,
      "223": 36,
      "224": 158221314,
      "225": 26549,
      "226": 36,
      "227": 74698472,
      "228": 36,
      "229": 333849714,
      "230": 1,
      "231": 254006273,
      "232": 72,
      "233": 2174038,
      "234": 72,
      "235": 2261318,
      "236": 64571,
      "237": 4,
      "238": 207616,
      "239": 8310,
      "240": 4,
      "241": 1293828,
      "242": 28716,
      "243": 63,
      "244": 0,
      "245": 1,
      "246": 1006041,
      "247": 43623,
      "248": 251,
      "249": 0,
      "250": 1,
    },
  },
};
