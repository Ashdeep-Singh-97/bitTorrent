import crypto from "crypto";

// converts string ot SHA-1 Hash

const convertToHash = (value: string): string => {

  const buffer = Buffer.from(value, "binary");

  const hash = crypto.createHash("sha1");

  hash.update(buffer);

  return hash.digest("hex");

};

export { convertToHash };