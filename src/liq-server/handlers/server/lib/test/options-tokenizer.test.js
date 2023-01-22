/* global expect */

import { optionsTokenizer } from '../options-tokenizer'

describe('optionsTokenizer', () => {
  test.each([
    ['all', [['all', null]]],
    ['foo=bar', [['foo', 'bar']]],
    ['foo="one two"', [['foo', 'one two']]],
    ['all foo=bar', [['all', null], ['foo', 'bar']]],
    ['all foo="one two"', [['all', null], ['foo', 'one two']]],
    ['foo=bar all', [['foo', 'bar'], ['all', null]]]
  ])('%s => %p', (inputString, expectedTokens) => expect(optionsTokenizer(inputString)).toEqual(expectedTokens))
})
