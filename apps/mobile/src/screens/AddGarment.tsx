/**
 * Add a garment (FR-40, F-043).
 *
 * ## Two fields, and the layout is the argument
 *
 * FR-40: *"never more than two required fields"*, and *"median time to add ≤ 20 s"*. Those are
 * the same requirement said twice — the time is spent on fields, so the screen puts the two
 * that are required at the top, the four colour paths beside them, and everything else under a
 * heading that says out loud it is optional. Nothing below that heading can block the save,
 * and `wardrobe.test.ts` asserts that field by field rather than trusting this comment.
 *
 * ## The screen decides nothing about whether a draft is saveable
 *
 * `draftProblem` does, in [`../wardrobe.ts`](../wardrobe.ts), the way `palette.ts` does for the
 * Studio. This file disables a control and shows a sentence. A screen that restated the rule
 * would be a second copy of it, and the copy nobody looks at is the one that drifts.
 *
 * ## Both stores and the image source arrive as props, required
 *
 * A default that quietly did not persist would look identical to one that did, right up to the
 * moment somebody reopened the app. And `expo-image-picker` needs a device, a permission
 * dialogue and a person — so the picker is a port, the route supplies the real one, and the
 * screen suite supplies one returning fixture bytes. Two of FR-40's four paths would otherwise
 * be testable only by hand.
 *
 * ## What this screen must never say
 *
 * That a Lens reading **is** a corpus colour. FR-13 is explicit that output language is
 * *"closest digital reference, never an assertion of identity"*, and the capture path here
 * stores the hex as the colour's name for exactly that reason. The button says the reading is
 * an estimate; nothing offers to name it.
 */

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Button, Surface, Swatch, swatchAccessibleName, Text, TextField } from '@irodora/ui';
import { uuidv7, ingestImage, ImageRejected } from '@irodora/store';
import {
  draftProblem,
  EMPTY_DRAFT,
  toStoreWrite,
  type DraftProblem,
  type GarmentDraft,
  type WardrobeStore,
} from '../wardrobe';
import { costEntry, type CostEntryProblem } from '../wardrobe/cost';
import type { ImageSource } from '../wardrobe/source';
import { allEntries, colorFor } from '../corpus';
import type { LensReading } from '../lens/reading';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Problem → sentence. Total, so a new problem is a compile error rather than a blank space. */
const PROBLEM_KEYS = {
  noType: 'wardrobe.noType',
  noColour: 'wardrobe.noColour',
  unknownSlug: 'wardrobe.unknownSlug',
} as const satisfies Record<DraftProblem, MessageKey>;

/**
 * Why a typed price was not recorded. Total, for the same reason as `PROBLEM_KEYS`.
 *
 * **None of these blocks the save** (F-051). FR-40 allows exactly two required fields and a
 * price is not one of them, so a price that cannot be read is a price this screen declines to
 * store — never a garment it declines to add. The sentence says so while somebody is still
 * typing, which is the only moment at which it can be fixed.
 */
const COST_PROBLEM_KEYS = {
  noAmount: 'wardrobe.costNoAmount',
  badAmount: 'wardrobe.costBadAmount',
  badCurrency: 'wardrobe.costBadCurrency',
  tooPrecise: 'wardrobe.costTooPrecise',
} as const satisfies Record<CostEntryProblem, MessageKey>;

export interface AddGarmentProps {
  readonly store: WardrobeStore;
  readonly imageSource: ImageSource;
  /**
   * A reading the Lens left for the wardrobe, taken once by the route.
   *
   * A prop rather than a call to `takeReading` here, for the reason the profile route gives:
   * `takeReading` consumes, so calling it during a re-render would hand back the reading the
   * first time and `null` on every keystroke after — the offered colour would appear and then
   * vanish while somebody was typing a brand into the field below it.
   */
  readonly offered?: LensReading | null;
}

export function AddGarment({ store, imageSource, offered }: AddGarmentProps): React.JSX.Element {
  const { t } = useMessages();

  const [draft, setDraft] = useState<GarmentDraft>(() =>
    offered == null
      ? EMPTY_DRAFT
      : { ...EMPTY_DRAFT, colour: { kind: 'reading', reading: offered } },
  );
  const [saved, setSaved] = useState(false);
  const [imageProblem, setImageProblem] = useState(false);
  const [count, setCount] = useState(() => store.listGarments().length);
  /*
   * The price is held as TYPED TEXT, not as the enrichment it becomes.
   *
   * `cost_minor` is an integer of minor units and its scale comes from the currency, so
   * "45.5" is not a value until there is a code beside it. Keeping the parsed patch in state
   * would mean deciding what to store on every keystroke — including the keystrokes in the
   * middle of a number — and the field would fight whoever was typing.
   */
  const [amountText, setAmountText] = useState('');
  const [currencyText, setCurrencyText] = useState('');

  const problem = draftProblem(draft);

  const money = costEntry(amountText, currencyText);
  // Silent until somebody has actually typed something. An empty optional field is not a
  // mistake, and a screen that opened with a complaint on it would be wrong about the
  // commonest case there is.
  const moneyTyped = amountText.trim() !== '' || currencyText.trim() !== '';
  const moneyProblem = moneyTyped && !money.ok ? money.problem : null;

  /**
   * Attach bytes from a source.
   *
   * The ingest is what makes this safe, and its failure is a normal outcome rather than a
   * crash: an oversized file, a decoder bomb or something that is not an image at all comes
   * back as `ImageRejected`, and the screen says so and **adds nothing**. A half-garment
   * created before the ingest threw would be the worst available result.
   */
  const attach = useCallback(async (take: () => Promise<Uint8Array | null>): Promise<void> => {
    setImageProblem(false);
    const bytes = await take();
    // `null` is cancellation, which is ordinary. Saying nothing is the correct response to
    // somebody changing their mind.
    if (bytes === null) return;
    try {
      const image = ingestImage(bytes);
      setDraft((d) => ({ ...d, image }));
    } catch (error) {
      if (!(error instanceof ImageRejected)) throw error;
      setImageProblem(true);
    }
  }, []);

  const save = useCallback(() => {
    const write = toStoreWrite(draft, uuidv7);
    const now = Date.now();
    store.createGarment(write, now);
    // A price that parsed joins the patch; one that did not is left out entirely rather than
    // written as a half — a cost with no currency is a number nobody can read back (F-051).
    const enrichment = money.ok ? { ...draft.enrichment, ...money.patch } : draft.enrichment;
    if (Object.keys(enrichment).length > 0) store.enrichGarment(write.id, enrichment, now);
    // The image last: it is the only part that can be large, and a garment without its
    // photograph is a garment. The reverse — a photograph with no garment — is not a thing the
    // foreign key would allow anyway.
    if (draft.image !== null) store.putGarmentImage(write.id, draft.image, now);
    setDraft(EMPTY_DRAFT);
    setAmountText('');
    setCurrencyText('');
    setSaved(true);
    setCount(store.listGarments().length);
  }, [draft, money, store]);

  const swatch = draft.colour;

  return (
    <ScrollView>
      <View style={{ padding: 16, gap: 16 }}>
        <Text size="title" color="foreground" heading>
          {t('wardrobe.title')}
        </Text>

        <TextField
          label={t('wardrobe.type')}
          placeholder={t('wardrobe.typeHint')}
          value={draft.type}
          onChangeText={(type) => {
            setDraft((d) => ({ ...d, type }));
            setSaved(false);
          }}
        />

        <Text size="body" color="foreground" heading>
          {t('wardrobe.colour')}
        </Text>

        {offered == null ? null : (
          <Button
            label={t('wardrobe.fromLens')}
            onPress={() => {
              setDraft((d) => ({ ...d, colour: { kind: 'reading', reading: offered } }));
            }}
          />
        )}

        <Text size="body" color="foreground.2">
          {t('wardrobe.pickColour')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allEntries()
            .slice(0, 12)
            .map((entry) => (
              <Pressable
                key={entry.entry.slug}
                accessibilityRole="button"
                // NAMED, because the a11y check caught twelve unnamed buttons here. A screen
                // reader announcing "button, button, button" twelve times is the failure that
                // looks fine on a screenshot. The helper composes the name, the
                // hex AND the provenance, so the announcement carries what the swatch does.
                accessibilityLabel={swatchAccessibleName(
                  entry.entry.name.en,
                  entry.derived.hex,
                  colorFor(entry.entry),
                )}
                onPress={() => {
                  setDraft((d) => ({ ...d, colour: { kind: 'corpus', slug: entry.entry.slug } }));
                  setSaved(false);
                }}
                style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
              >
                <Swatch
                  name={entry.entry.name.en}
                  hex={entry.derived.hex}
                  color={colorFor(entry.entry)}
                  size={48}
                  selected={swatch?.kind === 'corpus' && swatch.slug === entry.entry.slug}
                />
              </Pressable>
            ))}
        </View>

        <Text size="body" color="foreground" heading>
          {t('wardrobe.photo')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label={t('wardrobe.photoLibrary')}
            onPress={() => {
              void attach(() => imageSource.pickFromLibrary());
            }}
          />
          <Button
            label={t('wardrobe.photoCamera')}
            onPress={() => {
              void attach(() => imageSource.captureWithCamera());
            }}
          />
        </View>
        {draft.image === null ? null : (
          <Text size="body" color="foreground.2">
            {t('wardrobe.photoAttached')}
          </Text>
        )}
        {imageProblem ? (
          <Text size="body" color="foreground.2">
            {t('wardrobe.photoRejected')}
          </Text>
        ) : null}

        <Surface level="1">
          <View style={{ padding: 12, gap: 12 }}>
            <Text size="body" color="foreground.2">
              {t('wardrobe.optional')}
            </Text>
            <TextField
              label={t('wardrobe.brand')}
              value={typeof draft.enrichment.brand === 'string' ? draft.enrichment.brand : ''}
              onChangeText={(brand) => {
                setDraft((d) => ({ ...d, enrichment: { ...d.enrichment, brand } }));
              }}
            />
            <TextField
              label={t('wardrobe.size')}
              value={typeof draft.enrichment.size === 'string' ? draft.enrichment.size : ''}
              onChangeText={(size) => {
                setDraft((d) => ({ ...d, enrichment: { ...d.enrichment, size } }));
              }}
            />
            {/*
             * TWO FIELDS FOR ONE FACT, and they are deliberately adjacent. A price and its
             * currency are a single value — `cost_minor` does not record its own scale — so
             * the pair is what gets stored or nothing is (F-051, FR-46).
             */}
            <TextField
              label={t('wardrobe.cost')}
              hint={t('wardrobe.costHint')}
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
            />
            <TextField
              label={t('wardrobe.currency')}
              hint={t('wardrobe.currencyHint')}
              value={currencyText}
              onChangeText={setCurrencyText}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
            />
            {moneyProblem === null ? null : (
              <Text size="body" color="foreground.2">
                {`${t('wardrobe.costNotRecorded')} ${t(COST_PROBLEM_KEYS[moneyProblem])}`}
              </Text>
            )}
          </View>
        </Surface>

        <Button label={t('wardrobe.save')} disabled={problem !== null} onPress={save} />
        {/*
         * A disabled control with no stated reason is the accessibility failure that looks like
         * polish. The sentence is prose rather than a `Status`: F-069 forbids a status colour
         * beside a colour sample without a `swatch.well` between them, and this screen is
         * mostly samples — so it carries no colour channel at all, which satisfies golden rule
         * 13 by having nothing to satisfy.
         */}
        {problem === null ? null : (
          <Text size="body" color="foreground.2">
            {t(PROBLEM_KEYS[problem])}
          </Text>
        )}
        {saved ? (
          <Text size="body" color="foreground.2">
            {t('wardrobe.saved')}
          </Text>
        ) : null}

        <Text size="body" color="foreground.2" numeric>
          {`${t('wardrobe.count')}: ${String(count)}`}
        </Text>
      </View>
    </ScrollView>
  );
}
