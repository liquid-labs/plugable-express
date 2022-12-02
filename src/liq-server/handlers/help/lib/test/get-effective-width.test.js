/* global describe expect test */
import { getEffectiveWidth } from '../wrap'

describe('getEffectiveWidth', () => {
  test.each([
    [ '12<4>678', false, 5, 0, 5 ],
    [ '12<4>678', true, 5, 0, 8 ],
    [ '12<4>678', true, 3, 0, 6 ],
    [ '12<4678', true, 5, 0, 5 ],
    [ '12<4\n>678', true, 5, 0, 5 ],
    [ '12<4<67>90', true, 5, 0, 9 ],
    [ '12< <67>90', true, 5, 0, 9 ],
    [ '123 <foo>56 89', true, 5, 0, 10 ],
    [ '12<4><7>89', true, 5, 0, 11 ],
  ])("Using '%s', ignore tags: %p, width: %i, indent: %i yields EW '%i'", (text, ignoreTags, width, indent, ew) => {
    expect(getEffectiveWidth({ text, width, indent, ignoreTags })).toEqual(ew)
  })
})
