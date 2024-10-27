export type BEncodeValue =
  | string
  | number
  | Array<BEncodeValue>
  | { [key: string]: BEncodeValue };
