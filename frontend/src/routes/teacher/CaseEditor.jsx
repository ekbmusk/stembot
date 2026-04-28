import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getCase } from '../../api/cases';
import { createCase, updateCase } from '../../api/teacher';
import { FormulaRenderer } from '../../components/FormulaRenderer';
import { TopBar } from '../../components/Layout/TopBar';
import { Button } from '../../components/ui/Button';
import { useUiStore } from '../../store/uiStore';

const BLOCK_TYPES = ['text', 'formula', 'image', 'video', 'equipment', 'safety', 'divider'];

const EMPTY_CASE = {
  title_kk: '',
  objective_kk: '',
  situation_kk: '',
  theory_kk: '',
  cover_image_url: '',
  equipment: [],
  subject: 'physics',
  difficulty: 'medium',
  age_range: '',
  tags: [],
  is_published: true,
  blocks: [],
  videos: [],
  tasks: [],
};

function defaultPayload(type) {
  switch (type) {
    case 'text':
      return { text_kk: '' };
    case 'formula':
      return { latex: '', display: true };
    case 'image':
      return { url: '', caption_kk: '' };
    case 'video':
      return { provider: 'youtube', external_id_or_url: '', title_kk: '' };
    case 'equipment':
      return { items: [{ name: '', qty: 1 }] };
    case 'safety':
      return { text_kk: '' };
    case 'divider':
      return {};
    default:
      return {};
  }
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label-eyebrow mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, ...rest }) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-bg-deep/60 px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-primary/60 focus:outline-none"
      {...rest}
    />
  );
}

function TextArea({ value, onChange, rows = 4, ...rest }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full resize-none rounded-xl border border-border bg-bg-deep/60 px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-primary/60 focus:outline-none"
      {...rest}
    />
  );
}

function BlockEditor({ block, onChange }) {
  const update = (patch) => onChange({ ...block, payload: { ...block.payload, ...patch } });

  switch (block.type) {
    case 'text':
      return (
        <TextArea
          value={block.payload.text_kk}
          onChange={(text_kk) => update({ text_kk })}
          placeholder="Мәтін…"
        />
      );
    case 'formula':
      return (
        <div className="space-y-2">
          <TextInput
            value={block.payload.latex}
            onChange={(latex) => update({ latex })}
            placeholder="\\frac{a}{b}"
          />
          {block.payload.latex ? (
            <div className="rounded-xl border border-border bg-bg-deep/60 p-3">
              <FormulaRenderer>
                {block.payload.display === false
                  ? `$${block.payload.latex}$`
                  : `$$${block.payload.latex}$$`}
              </FormulaRenderer>
            </div>
          ) : null}
        </div>
      );
    case 'image':
      return (
        <div className="space-y-2">
          <TextInput
            value={block.payload.url}
            onChange={(url) => update({ url })}
            placeholder="https://…"
          />
          <TextInput
            value={block.payload.caption_kk}
            onChange={(caption_kk) => update({ caption_kk })}
            placeholder="Қосымша сипаттама"
          />
        </div>
      );
    case 'video':
      return (
        <div className="space-y-2">
          <TextInput
            value={block.payload.external_id_or_url}
            onChange={(external_id_or_url) => update({ external_id_or_url })}
            placeholder="YouTube ID немесе URL"
          />
          <TextInput
            value={block.payload.title_kk}
            onChange={(title_kk) => update({ title_kk })}
            placeholder="Атауы"
          />
        </div>
      );
    case 'safety':
      return (
        <TextArea
          value={block.payload.text_kk}
          onChange={(text_kk) => update({ text_kk })}
          placeholder="Қауіпсіздік ескертуі…"
        />
      );
    case 'equipment': {
      const items = block.payload.items ?? [];
      return (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_64px_28px] gap-2">
              <TextInput
                value={it.name}
                onChange={(name) =>
                  update({
                    items: items.map((x, j) => (j === i ? { ...x, name } : x)),
                  })
                }
                placeholder="Атау"
              />
              <TextInput
                type="number"
                value={it.qty}
                onChange={(qty) =>
                  update({
                    items: items.map((x, j) =>
                      j === i ? { ...x, qty: Number(qty) || 1 } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  update({ items: items.filter((_, j) => j !== i) })
                }
                className="text-ink-faint hover:text-danger"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => update({ items: [...items, { name: '', qty: 1 }] })}
          >
            <Plus size={14} /> Жабдық қосу
          </Button>
        </div>
      );
    }
    case 'divider':
      return <p className="text-[12px] text-ink-faint">— бөлгіш сызық —</p>;
    default:
      return null;
  }
}

export default function CaseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useUiStore((s) => s.showToast);

  const [data, setData] = useState(EMPTY_CASE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    getCase(Number(id))
      .then((c) =>
        setData({
          ...EMPTY_CASE,
          ...c,
          equipment: c.equipment ?? [],
          tags: c.tags ?? [],
          blocks: c.blocks ?? [],
          videos: c.videos ?? [],
          tasks: c.tasks ?? [],
        }),
      )
      .finally(() => setLoading(false));
  }, [id]);

  function update(patch) {
    setData((d) => ({ ...d, ...patch }));
  }

  function addBlock(type) {
    setData((d) => ({
      ...d,
      blocks: [
        ...d.blocks,
        { id: `tmp-${Date.now()}`, position: d.blocks.length, type, payload: defaultPayload(type) },
      ],
    }));
  }

  function updateBlock(idx, next) {
    setData((d) => ({ ...d, blocks: d.blocks.map((b, i) => (i === idx ? next : b)) }));
  }

  function removeBlock(idx) {
    setData((d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== idx) }));
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const blocks = Array.from(data.blocks);
    const [moved] = blocks.splice(result.source.index, 1);
    blocks.splice(result.destination.index, 0, moved);
    update({ blocks: blocks.map((b, i) => ({ ...b, position: i })) });
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...data,
        blocks: data.blocks.map((b, i) => ({
          position: i,
          type: b.type,
          payload: b.payload,
        })),
        videos: data.videos.map((v, i) => ({ ...v, position: i })),
        tasks: data.tasks.map((t, i) => ({ ...t, position: i })),
      };
      const result = id ? await updateCase(Number(id), payload) : await createCase(payload);
      showToast('Кейс сақталды', 'success');
      navigate(`/cases/${result.id}`);
    } catch (e) {
      showToast(e.message ?? 'Сақтай алмадым', 'danger');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <TopBar back eyebrow="редактор" title="Кейс" />
      </>
    );
  }

  return (
    <>
      <TopBar
        back
        eyebrow="редактор"
        title={id ? 'Кейсті өңдеу' : 'Жаңа кейс'}
        action={
          <Button size="sm" onClick={save} disabled={saving}>
            <Save size={14} /> Сақтау
          </Button>
        }
      />

      <section className="mb-3 space-y-2 rounded-2xl border border-border bg-surface p-4">
        <Field label="атауы">
          <TextInput value={data.title_kk} onChange={(v) => update({ title_kk: v })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="пән">
            <select
              value={data.subject}
              onChange={(e) => update({ subject: e.target.value })}
              className="w-full rounded-xl border border-border bg-bg-deep/60 px-3 py-2 text-[14px] text-ink"
            >
              {[
                'physics','chemistry','biology','mathematics','informatics',
                'engineering','astronomy','ecology','interdisciplinary',
              ].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="деңгей">
            <select
              value={data.difficulty}
              onChange={(e) => update({ difficulty: e.target.value })}
              className="w-full rounded-xl border border-border bg-bg-deep/60 px-3 py-2 text-[14px] text-ink"
            >
              <option value="easy">оңай</option>
              <option value="medium">орташа</option>
              <option value="hard">қиын</option>
            </select>
          </Field>
        </div>
        <Field label="мақсаты">
          <TextArea
            value={data.objective_kk}
            onChange={(v) => update({ objective_kk: v })}
            rows={2}
          />
        </Field>
        <Field label="жағдаят">
          <TextArea
            value={data.situation_kk}
            onChange={(v) => update({ situation_kk: v })}
            rows={4}
          />
        </Field>
        <Field label="теория (LaTeX қолдау)">
          <TextArea
            value={data.theory_kk}
            onChange={(v) => update({ theory_kk: v })}
            rows={4}
          />
        </Field>
      </section>

      <p className="label-eyebrow mb-2 px-1">блоктар</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {data.blocks.map((b, i) => (
                <Draggable key={b.id ?? i} draggableId={String(b.id ?? i)} index={i}>
                  {(p) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      className="rounded-2xl border border-border bg-surface p-3"
                    >
                      <header className="mb-2 flex items-center gap-2">
                        <span {...p.dragHandleProps} className="text-ink-faint">
                          <GripVertical size={14} />
                        </span>
                        <span className="label-eyebrow">{b.type}</span>
                        <button
                          type="button"
                          onClick={() => removeBlock(i)}
                          className="ml-auto text-ink-faint hover:text-danger"
                          aria-label="Remove block"
                        >
                          <Trash2 size={14} />
                        </button>
                      </header>
                      <BlockEditor block={b} onChange={(next) => updateBlock(i, next)} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mt-3 flex flex-wrap gap-2">
        {BLOCK_TYPES.map((t) => (
          <Button key={t} size="sm" variant="secondary" onClick={() => addBlock(t)}>
            <Plus size={14} /> {t}
          </Button>
        ))}
      </div>
    </>
  );
}
