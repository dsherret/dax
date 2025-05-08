// Vendored and modified from: https://github.com/cspotcode/outdent/blob/1aaf39e4788a41412eb0aab2943da5afe63d7dd1/src/index.ts
// Modified because it had some CommonJS code in it that was causing warnings in the esbuild build.

// The MIT License (MIT)
//
// Copyright (c) 2016 Andrew Bradley

// Copy all own enumerable properties from source to target
function extend<T, S extends object>(target: T, source: S) {
  type Extended = T & S;
  for (const prop in source) {
    if (Object.hasOwn(source, prop)) {
      (target as any)[prop] = source[prop];
    }
  }
  return target as Extended;
}

const reLeadingNewline = /^[ \t]*(?:\r\n|\r|\n)/;
const reTrailingNewline = /(?:\r\n|\r|\n)[ \t]*$/;
const reStartsWithNewlineOrIsEmpty = /^(?:[\r\n]|$)/;
const reDetectIndentation = /(?:\r\n|\r|\n)([ \t]*)(?:[^ \t\r\n]|$)/;
const reOnlyWhitespaceWithAtLeastOneNewline = /^[ \t]*[\r\n][ \t\r\n]*$/;

function _outdentArray(
  strings: ReadonlyArray<string>,
  firstInterpolatedValueSetsIndentationLevel: boolean,
  options: Options,
) {
  // If first interpolated value is a reference to outdent,
  // determine indentation level from the indentation of the interpolated value.
  let indentationLevel = 0;

  const match = strings[0].match(reDetectIndentation);
  if (match) {
    indentationLevel = match[1].length;
  }

  const reSource = `(\\r\\n|\\r|\\n).{0,${indentationLevel}}`;
  const reMatchIndent = new RegExp(reSource, "g");

  if (firstInterpolatedValueSetsIndentationLevel) {
    strings = strings.slice(1);
  }

  const { newline, trimLeadingNewline, trimTrailingNewline } = options;
  const normalizeNewlines = typeof newline === "string";
  const l = strings.length;
  const outdentedStrings = strings.map((v, i) => {
    // Remove leading indentation from all lines
    v = v.replace(reMatchIndent, "$1");
    // Trim a leading newline from the first string
    if (i === 0 && trimLeadingNewline) {
      v = v.replace(reLeadingNewline, "");
    }
    // Trim a trailing newline from the last string
    if (i === l - 1 && trimTrailingNewline) {
      v = v.replace(reTrailingNewline, "");
    }
    // Normalize newlines
    if (normalizeNewlines) {
      v = v.replace(/\r\n|\n|\r/g, (_) => newline as string);
    }
    return v;
  });
  return outdentedStrings;
}

function concatStringsAndValues(
  strings: ReadonlyArray<string>,
  values: ReadonlyArray<any>,
): string {
  let ret = "";
  for (let i = 0, l = strings.length; i < l; i++) {
    ret += strings[i];
    if (i < l - 1) {
      ret += values[i];
    }
  }
  return ret;
}

function isTemplateStringsArray(v: any): v is TemplateStringsArray {
  return Object.hasOwn(v, "raw") && Object.hasOwn(v, "length");
}

/**
 * It is assumed that opts will not change.  If this is a problem, clone your options object and pass the clone to
 * makeInstance
 * @param options
 * @return {outdent}
 */
function createInstance(options: Options): Outdent {
  /** Cache of pre-processed template literal arrays */
  const arrayAutoIndentCache = new WeakMap<
    TemplateStringsArray,
    Array<string>
  >();
  /**
   * Cache of pre-processed template literal arrays, where first interpolated value is a reference to outdent,
   * before interpolated values are injected.
   */
  const arrayFirstInterpSetsIndentCache = new WeakMap<
    TemplateStringsArray,
    Array<string>
  >();

  /* tslint:disable:no-shadowed-variable */
  function outdent(
    stringsOrOptions: TemplateStringsArray,
    ...values: Array<any>
  ): string;
  function outdent(stringsOrOptions: Options): Outdent;
  function outdent(
    stringsOrOptions: TemplateStringsArray | Options,
    ...values: Array<any>
  ): string | Outdent {
    /* tslint:enable:no-shadowed-variable */
    if (isTemplateStringsArray(stringsOrOptions)) {
      const strings = stringsOrOptions;

      // Is first interpolated value a reference to outdent, alone on its own line, without any preceding non-whitespace?
      const firstInterpolatedValueSetsIndentationLevel = (values[0] === outdent || values[0] === defaultOutdent)
        && reOnlyWhitespaceWithAtLeastOneNewline.test(strings[0])
        && reStartsWithNewlineOrIsEmpty.test(strings[1]);

      // Perform outdentation
      const cache = firstInterpolatedValueSetsIndentationLevel ? arrayFirstInterpSetsIndentCache : arrayAutoIndentCache;
      let renderedArray = cache.get(strings);
      if (!renderedArray) {
        renderedArray = _outdentArray(
          strings,
          firstInterpolatedValueSetsIndentationLevel,
          options,
        );
        cache.set(strings, renderedArray);
      }
      /** If no interpolated values, skip concatenation step */
      if (values.length === 0) {
        return renderedArray[0];
      }
      /** Concatenate string literals with interpolated values */
      const rendered = concatStringsAndValues(
        renderedArray,
        firstInterpolatedValueSetsIndentationLevel ? values.slice(1) : values,
      );

      return rendered;
    } else {
      // Create and return a new instance of outdent with the given options
      return createInstance(
        extend(extend({}, options), stringsOrOptions || {}),
      );
    }
  }

  const fullOutdent = extend(outdent, {
    string(str: string): string {
      return _outdentArray([str], false, options)[0];
    },
  });

  return fullOutdent;
}

const defaultOutdent: Outdent = createInstance({
  trimLeadingNewline: true,
  trimTrailingNewline: true,
});

export interface Outdent {
  /**
   * Remove indentation from a template literal.
   */
  (strings: TemplateStringsArray, ...values: Array<any>): string;
  /**
   * Create and return a new Outdent instance with the given options.
   */
  (options: Options): Outdent;

  /**
   * Remove indentation from a string
   */
  string(str: string): string;

  // /**
  //  * Remove indentation from a template literal, but return a tuple of the
  //  * outdented TemplateStringsArray and
  //  */
  // pass(strings: TemplateStringsArray, ...values: Array<any>): [TemplateStringsArray, ...Array<any>];
}

export interface Options {
  trimLeadingNewline?: boolean;
  trimTrailingNewline?: boolean;
  /**
   * Normalize all newlines in the template literal to this value.
   *
   * If `null`, newlines are left untouched.
   *
   * Newlines that get normalized are '\r\n', '\r', and '\n'.
   *
   * Newlines within interpolated values are *never* normalized.
   *
   * Although intended for normalizing to '\n' or '\r\n',
   * you can also set to any string; for example ' '.
   */
  newline?: string | null;
}

export { defaultOutdent as outdent };
