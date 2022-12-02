/* global describe expect test */

import { wrap } from '../wrap'

describe('wrap', () => {
  test.each([
    [ '123 56 89', 5, 0, '123\n56 89' ],
    [ '123 56 89', 6, 0, '123 56\n89'],
    [ '123 56 89', 7, 0, '123 56\n89'],
    [ '123 56 89', 9, 0, '123 56 89'],
    [ '123 56 89', 5, 1, ' 123\n 56\n 89'],
    [ '123-56 89', 5, 0, '123-\n56 89' ],
    [ '123-56 89', 6, 0, '123-56\n89'],
    [ '123-56 89', 7, 0, '123-56\n89'],
    [ '123-56 89', 9, 0, '123-56 89'],
    [ '123-56 89', 5, 1, ' 123-\n 56\n 89']
  ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, indent, result) => {
    expect(wrap(input, { indent, width })).toEqual(result)
  })
  
  test('formats `code`', () => {
    expect(wrap('foo `bar` baz', { formatTerminal: true })).toEqual('foo <reverse>bar<rst> baz')
  })
})
