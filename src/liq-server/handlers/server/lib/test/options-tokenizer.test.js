/* global expect */

import { optionsTokenizer } from '../options-tokenizer'

describe('optionsTokenizer', () => {
  test.each([
    [ 'all', [[ 'all', true ]]],
    [ 'foo=bar', [[ 'foo', 'bar' ]]],
    [ 'foo="one two"', [[ 'foo', 'one two' ]]],
    [ 'all foo=bar', [[ 'all', true ], [ 'foo', 'bar' ]]],
    [ 'all foo="one two"' , [[ 'all', true ], [ 'foo', 'one two' ]]],
    [ 'foo=bar all', [[ 'foo', 'bar' ], [ 'all', true ]]]
  ])('%s => %p', (inputString, expectedTokens) => expect(optionsTokenizer(inputString)).toEqual(expectedTokens))
})
