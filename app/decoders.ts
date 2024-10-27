import type { BEncodeValue } from "./customTypes";

// Existing decoders
export function stringDecoder(bencodedValue: string): [BEncodeValue, number] {
  const strlen = parseInt(bencodedValue.split(":")[0]);
  const firstColonIndex = bencodedValue.indexOf(":");

  if (firstColonIndex === -1) {
    throw new Error("Invalid encoded string: missing colon");
  }

  return [
    bencodedValue.substring(firstColonIndex + 1, firstColonIndex + 1 + strlen),
    firstColonIndex + 1 + strlen,
  ];
}

export function intDecoder(bencodedValue: string): [BEncodeValue, number] {
  const endOfValue = bencodedValue.indexOf("e");
  if (endOfValue === -1) {
    throw new Error("Invalid encoded integer: missing 'e'");
  }

  return [parseInt(bencodedValue.substring(1, endOfValue)), endOfValue + 1];
}

export function listDecoder(bencodedValue: string): [BEncodeValue, number] {
  const decodedList: BEncodeValue[] = [];
  let offset = 1;

  while (offset < bencodedValue.length) {
    if (bencodedValue[offset] === "e") break;

    const [decodedValue, encodedLength] = decodeBencode(
      bencodedValue.substring(offset)
    );
    decodedList.push(decodedValue);
    offset += encodedLength;
  }

  return [decodedList, offset + 1];
}

export function dictDecoder(bencodedValue: string): [BEncodeValue, number] {
  const decodedDict: { [key: string]: BEncodeValue } = {};
  let offset = 1;

  while (offset < bencodedValue.length) {
    if (bencodedValue[offset] === "e") break;

    const [decodedKey, keyLength] = decodeBencode(
      bencodedValue.substring(offset)
    );

    if (typeof decodedKey !== "string") {
      throw new Error("Invalid encoded dictionary: keys must be strings");
    }

    offset += keyLength;
    const [decodedValue, valueLength] = decodeBencode(
      bencodedValue.substring(offset)
    );
    offset += valueLength;

    decodedDict[decodedKey] = decodedValue;
  }

  return [decodedDict, offset + 1];
}

// Decode wrapper
export function decodeBencode(bencodedValue: string): [BEncodeValue, number] {
  if (bencodedValue[0] === "i") return intDecoder(bencodedValue);
  if (bencodedValue[0] === "l") return listDecoder(bencodedValue);
  if (bencodedValue[0] === "d") return dictDecoder(bencodedValue);
  if (!isNaN(parseInt(bencodedValue[0]))) return stringDecoder(bencodedValue);

  throw new Error("Unsupported type");
}

// Encode helper functions
function encodeString(value: string): string {
  return `${value.length}:${value}`;
}

function encodeInteger(value: number): string {
  return `i${value}e`;
}

function encodeList(value: BEncodeValue[]): string {
  return `l${value.map(encode).join("")}e`;
}

function encodeDict(value: { [key: string]: BEncodeValue }): string {
  const sortedKeys = Object.keys(value).sort();
  return `d${sortedKeys
    .map((key) => encodeString(key) + encode(value[key]))
    .join("")}e`;
}

// Main encode function
export function encode(value: BEncodeValue): string {
  if (typeof value === "string") {
    return encodeString(value);
  } else if (typeof value === "number") {
    return encodeInteger(value);
  } else if (Array.isArray(value)) {
    return encodeList(value);
  } else if (typeof value === "object" && value !== null) {
    return encodeDict(value as { [key: string]: BEncodeValue });
  }

  throw new Error("Unsupported BEncodeValue type");
}
