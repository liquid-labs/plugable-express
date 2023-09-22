/* global describe expect test */
import { wrap } from '../wrap'

describe('wrap', () => {
  test.each([
    ['123 56 89', 5, 0, '123\n56 89'],
    ['123 56 89', 6, 0, '123 56\n89'],
    ['123 56 89', 7, 0, '123 56\n89'],
    ['123 56 89', 9, 0, '123 56 89'],
    ['123 56 89', 5, 1, ' 123\n 56\n 89'],
    ['123-56 89', 5, 0, '123-\n56 89'],
    ['123-56 89', 6, 0, '123-56\n89'],
    ['123-56 89', 7, 0, '123-56\n89'],
    ['123-56 89', 9, 0, '123-56 89'],
    ['123-56 89', 5, 1, ' 123-\n 56\n 89']
  ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, indent, result) => {
    expect(wrap(input, { indent, width })).toEqual(result)
  })

  test.each([
    ['1<foo>23 56 89', 5, 0, '1<foo>23\n56 89'],
    ['123 <foo>56 89', 5, 0, '123\n<foo>56 89'],
    ['123 <foo>56 89', 4, 0, '123\n<foo>56\n89']
  ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, indent, result) => {
    expect(wrap(input, { indent, ignoreTags : true, width })).toEqual(result)
  })
})
