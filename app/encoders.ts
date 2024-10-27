import type { BEncodeValue } from "./customTypes";

const stringEncoder = (value: string): string => {

  const length = value.length;

  return `${length}:${value}`;

};

const intEncoder = (value: number): string => {

  return `i${value}e`;

};

const listEncoder = (list: any): string => {

  let encodedList = "";

  for (let item of list) {

    if (typeof item === "number") encodedList += intEncoder(item);

    else if (typeof item === "string") encodedList += stringEncoder(item);

    else if (Array.isArray(item)) encodedList += listEncoder(item);

    else if (typeof item === "object" && item !== null && !Array.isArray(item))

      encodedList += dictEncoder(item);

  }

  return `l${encodedList}e`;

};

const dictEncoder = (dict: { [key: string]: BEncodeValue }): string => {

  let encodedDict = "";

  for (let item in dict) {

    const key = stringEncoder(item);

    if (typeof dict[item] === "number")

      encodedDict += `${key}${intEncoder(dict[item])}`;

    else if (typeof dict[item] === "string")

      encodedDict += `${key}${stringEncoder(dict[item])}`;

    else if (typeof Array.isArray(dict[item]))

      encodedDict += `${key}${listEncoder(dict[item])}`;

    else if (

      typeof dict[item] === "object" &&

      dict[item] !== null &&

      !Array.isArray(dict[item])

    )

      encodedDict += `${key}${dictEncoder(dict[item])}`;

  }

  return `d${encodedDict}e`;

};

export { stringEncoder, intEncoder, listEncoder, dictEncoder };