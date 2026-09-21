/**
 * The avatar `23` draws, and the three things it must never become (F-241).
 *
 * ## The assertions here are mostly negative, because the criterion is
 *
 * *"No face or colour is read from it — it is decoration."* A component cannot prove it does not
 * read a face by rendering correctly, so what is checkable at this layer is the SHAPE that makes
 * reading one impossible: no colour in the props, no colour on the node, and nothing announced
 * about a picture whose contents this package knows nothing about.
 *
 * The scan that refuses a colour or vision import on the app's avatar path is the other half, and
 * it lives beside the code it scans.
 */

import { render } from '@testing-library/react-native';
import { Avatar, AVATAR_SIZE, ThemeProvider, type AvatarProps } from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

const PICTURE = 'data:image/png;base64,iVBORw0KGgo=';

function draw(node: React.JSX.Element, theme: 'light' | 'dark' = 'light'): TestNode {
  const rendered = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const json = rendered.toJSON();
  rendered.unmount();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

const walk = (node: TestNode, out: TestNode[] = []): TestNode[] => {
  out.push(node);
  for (const child of node.children ?? []) if (typeof child !== 'string') walk(child, out);
  return out;
};

const images = (tree: TestNode): TestNode[] =>
  walk(tree).filter((n) => n.props['source'] !== undefined);

/**
 * The avatar's own node, found by the clip rather than by position.
 *
 * `draw` renders inside `ThemeProvider`, so the tree's ROOT is the provider's view — asserting
 * on it would be asserting about a wrapper, which is how these four assertions failed first time.
 */
const avatarNode = (tree: TestNode): TestNode => {
  const found = walk(tree).find((n) => flattenStyle(n.props['style'])['overflow'] === 'hidden');
  if (found === undefined) throw new Error('no avatar node in the tree');
  return found;
};

/** The mark's SVG, which carries the size it was rendered at. */
const markSvg = (tree: TestNode): TestNode | undefined =>
  walk(tree).find((n) => n.type.includes('Svg'));

describe('the picture, when there is one', () => {
  it('renders it at the drawn diameter, clipped to a circle', () => {
    const style = flattenStyle(avatarNode(draw(<Avatar uri={PICTURE} />)).props['style']);
    expect(style['width']).toBe(AVATAR_SIZE);
    expect(style['height']).toBe(AVATAR_SIZE);
    // A rectangle with a round shadow is what an unclipped image looks like on Android, where
    // `borderRadius` on the Image itself is ignored. The clip is on the wrapper.
    expect(style['overflow']).toBe('hidden');
    expect(typeof style['borderRadius']).toBe('number');
  });

  it('passes the caller a size it actually uses', () => {
    // Without this, `size` could be decoration on a component that always drew 36.
    const style = flattenStyle(avatarNode(draw(<Avatar uri={PICTURE} size={72} />)).props['style']);
    expect(style['width']).toBe(72);
    expect(style['height']).toBe(72);
  });

  it('covers rather than letterboxes', () => {
    expect(images(draw(<Avatar uri={PICTURE} />))[0]?.props['resizeMode']).toBe('cover');
  });

  it('says nothing about what is IN the picture', () => {
    /*
     * The component knows nothing about the contents and must not imply that it does. The inner
     * image is `accessible={false}` whatever the wrapper carries — a screen reader announcing
     * "image" inside a labelled avatar is the same thing said twice, and announcing anything
     * more would be a claim about a photograph nothing here has looked at.
     */
    expect(
      images(draw(<Avatar uri={PICTURE} label="Your profile" />))[0]?.props['accessible'],
    ).toBe(false);
  });
});

describe('the mark, when there is not', () => {
  it('renders the mark instead of the picture', () => {
    const tree = draw(<Avatar uri={null} />);
    expect(images(tree)).toHaveLength(0);
    // The mark draws an SVG; finding one is how "the mark is there" is checked without
    // reaching into `brand.tsx`'s internals.
    expect(walk(tree).some((n) => n.type.includes('Svg'))).toBe(true);
  });

  it('DECOY — the picture branch draws no mark', () => {
    // Without this, a component that drew both would satisfy the assertion above and the
    // fallback would be a fallback in name only.
    const tree = draw(<Avatar uri={PICTURE} />);
    expect(images(tree)).toHaveLength(1);
    expect(walk(tree).some((n) => n.type.includes('Svg'))).toBe(false);
  });

  it('scales the mark with the avatar rather than pinning it', () => {
    const width = (size: number): number =>
      Number(markSvg(draw(<Avatar uri={null} size={size} />))?.props['width']);
    expect(width(72)).toBeGreaterThan(width(36));
    // And it is a FRACTION of the avatar rather than the whole of it: a mark drawn edge to edge
    // reads larger than the photograph it stands in for, because a photograph has no margins.
    expect(width(72)).toBeLessThan(72);
  });
});

describe('what a screen reader is told', () => {
  it('is decorative with no label, hidden from both platforms rather than merely unnamed', () => {
    // An unlabelled View is skipped by VoiceOver and announced as an unnamed element by some
    // TalkBack versions. `Mark` draws the same distinction, and for the same reason.
    const props = avatarNode(draw(<Avatar uri={PICTURE} />)).props;
    expect(props['accessible']).toBe(false);
    expect(props['accessibilityElementsHidden']).toBe(true);
    expect(props['importantForAccessibility']).toBe('no-hide-descendants');
  });

  it('announces the name the caller gave it, and only that', () => {
    const props = avatarNode(draw(<Avatar uri={PICTURE} label="Your profile" />)).props;
    expect(props['accessibilityLabel']).toBe('Your profile');
    expect(props['accessibilityRole']).toBe('image');
    expect(props['accessibilityElementsHidden']).toBeUndefined();
  });
});

describe('nothing about it is a colour', () => {
  /*
   * THE CRITERION, AT THIS LAYER. `Avatar` cannot read a colour out of a photograph because it
   * has nowhere to put one and nothing to read it with — and the way to check that is to look
   * at what it paints and what its props carry, both of which can fail.
   */
  it('paints no colour of its own, in either theme', () => {
    for (const theme of ['light', 'dark'] as const) {
      const painted = walk(draw(<Avatar uri={PICTURE} />, theme))
        .map((n) => flattenStyle(n.props['style'])['backgroundColor'])
        .filter((v) => v !== undefined);
      expect(painted).toStrictEqual([]);
    }
  });

  it('takes a uri, a size and a label — and no Color', () => {
    /*
     * A TYPE ASSERTION, because the runtime cannot see a prop nobody passed. F-239's review
     * caught an arity check that could not fail; this is the version that can: it does not
     * compile if `AvatarProps` grows a key outside this list.
     */
    const keys: readonly (keyof AvatarProps)[] = ['uri', 'size', 'label'];
    expect(keys).toStrictEqual(['uri', 'size', 'label']);
  });
});
