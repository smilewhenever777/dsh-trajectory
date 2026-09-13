import React from 'react';
import type { TrajEntry, TrajNode, TrajProjectFile, TrajStatus } from '../shared/types';
import type { DashProgress } from './dash';
import type { TFunc } from './nav';
import { Icon, Icons, relTime, statusColor, T, TrajStyles, truncate } from './ui';
import { NODE_KIND_LABELS, STATUS_LABELS } from './locales';

const GLYPH: Record<string, string> = {
  milestone: '★', idea: '◆', experiment: '▷', paper: '▣', writing: '✎', other: '○',
};

const OPEN_ORDER: TrajStatus[] = ['in_progress', 'blocked', 'todo'];

/** 分支排序权重:未完成按 OPEN_ORDER,done/dropped(indexOf 为 -1)排最后 */
const openRank = (s: TrajStatus): number => {
  const i = OPEN_ORDER.indexOf(s);
  return i === -1 ? OPEN_ORDER.length : i;
};

const fmtDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

/** 台账行:日期 | 做了什么 | 数据(等宽高亮) | 结论 | 删除 */
function EntryRow({ e, t, onDelete }: { e: TrajEntry; t: TFunc; onDelete: () => void }) {
  return (
    <div style={{
      padding: '6px 9px', marginTop: 5, borderRadius: 8,
      background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08))',
      border: '1px solid var(--dsw-alias-border-l2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: 9.5, color: T.caption, flex: 'none', fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
          {fmtDate(e.ts)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', lineHeight: 1.45, flex: 1, minWidth: 0 }}>
          {e.title}
        </span>
        <button
          type="button"
          title={t('entry.delete')}
          onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
          onMouseEnter={(ev) => { ev.currentTarget.style.color = T.danger; }}
          onMouseLeave={(ev) => { ev.currentTarget.style.color = T.caption; }}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', flex: 'none',
            color: T.caption, display: 'inline-flex', padding: 2, alignSelf: 'center',
          }}
        >
          <Icon d={Icons.trash} size={11} />
        </button>
      </div>
      {e.data && (
        <div style={{
          marginTop: 3, marginLeft: 39, fontSize: 10.5, lineHeight: 1.55,
          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          color: 'var(--dsw-alias-state-business-primary, #4d6bfe)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {e.data}
        </div>
      )}
      {e.conclusion && (
        <div style={{ marginTop: 3, marginLeft: 39, fontSize: 10.5, lineHeight: 1.55, color: T.secondary, wordBreak: 'break-word' }}>
          <span style={{ color: T.caption }}>结论 </span>{e.conclusion}
        </div>
      )}
    </div>
  );
}

/** 节点卡(梳理视图):标题/状态/进度 + 实验台账 */
function DigestNode({ node, progress, t, onOpen, onDelete, onDeleteEntry, accent, defaultOpen }: {
  node: TrajNode;
  progress: Map<string, DashProgress>;
  t: TFunc;
  onOpen: (n: TrajNode) => void;
  onDelete: (n: TrajNode) => void;
  /** 删除该节点上的一条台账(entryId) */
  onDeleteEntry?: (entryId: string) => void;
  accent?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  const prog = progress.get(node.id);
  const entries = [...(node.entries ?? [])].sort((a, b) => b.ts - a.ts);
  return (
    <div
      className="traj-card"
      data-dsh-part="digest-node"
      style={{
        borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2)',
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        background: 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,.05))',
        padding: '8px 10px', marginBottom: 8, cursor: 'pointer',
      }}
      onClick={() => onOpen(node)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 10.5, color: statusColor(node.status), flex: 'none' }}>{GLYPH[node.kind] ?? '○'}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, lineHeight: 1.4 }}>
          {node.status === 'dropped' ? <s style={{ color: T.caption }}>{node.title}</s> : node.title}
        </span>
        <span style={{
          fontSize: 9.5, color: statusColor(node.status), flex: 'none',
          padding: '1px 7px', borderRadius: 999,
          background: `color-mix(in srgb, ${statusColor(node.status)} 13%, transparent)`,
        }}>
          {t(STATUS_LABELS[node.status])}
        </span>
        <button
          type="button"
          title={t('node.deleteConfirm')}
          onClick={(e) => { e.stopPropagation(); onDelete(node); }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.danger; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.caption; }}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', flex: 'none',
            color: T.caption, display: 'inline-flex', padding: 2,
          }}
        >
          <Icon d={Icons.trash} size={12} />
        </button>
      </div>
      {/* meta 行:进度 / 依赖类型 / 时间 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, marginLeft: 17 }}>
        <span style={{ fontSize: 9.5, color: T.caption, flex: 'none' }}>
          {t(NODE_KIND_LABELS[node.kind])} · {relTime(node.updatedAt)}
        </span>
        {node.kind === 'experiment' && prog?.pct != null && (
          <span style={{ flex: 1, maxWidth: 150, minWidth: 50, height: 4, borderRadius: 2, background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.25))', position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
            <span style={{ position: 'absolute', inset: 0, width: `${prog.pct}%`, background: prog.stale ? T.warning : T.teal, borderRadius: 2 }} />
          </span>
        )}
        {node.kind === 'experiment' && prog && (
          <span style={{ fontSize: 9.5, color: prog.stale ? T.warning : T.teal, fontVariantNumeric: 'tabular-nums' }}>
            {prog.label || (prog.stale ? t('node.stale') : '')}
          </span>
        )}
        {entries.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            style={{
              marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 9.5, color: T.business, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
            }}
          >
            <Icon d={Icons.chevronDown} size={10} />
            {t('digest.entries', { n: entries.length })}
          </button>
        )}
      </div>
      {node.detail && (
        <div style={{ marginTop: 4, marginLeft: 17, fontSize: 10.5, color: T.secondary, lineHeight: 1.55 }}>
          {node.detail}
        </div>
      )}
      {open && entries.map((e) => (
        <EntryRow key={e.id} e={e} t={t} onDelete={() => onDeleteEntry?.(e.id)} />
      ))}
    </div>
  );
}

/**
 * 清单页 = 项目梳理视图:研究问题 → 主线里程碑演变(带各节点实验台账)→ 分支工作 → 待办。
 * 「已发生的工作」是主角;未来计划弱化在底部。
 */
export function TrajListView({ t, file, progress, onOpen, onDelete, onDeleteEntry }: {
  t: TFunc;
  file: TrajProjectFile | null;
  progress: Map<string, DashProgress>;
  onOpen: (node: TrajNode) => void;
  onDelete: (node: TrajNode) => void;
  /** 删除节点上的实验台账(带确认;调 DELETE /traj/nodes/:id/entries/:eid) */
  onDeleteEntry: (nodeId: string, entryId: string) => void;
}) {
  if (!file) {
    return <div style={{ flex: 1, padding: 14, fontSize: 12, color: T.caption }}>{t('common.loading')}</div>;
  }

  const byId = new Map(file.nodes.map((n) => [n.id, n]));
  const mainline = file.project.mainline.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const mainlineSet = new Set(mainline.map((n) => n.id));
  const branches = file.nodes
    .filter((n) => !mainlineSet.has(n.id))
    .sort((a, b) => openRank(a.status) - openRank(b.status) || b.updatedAt - a.updatedAt);
  const todos = file.nodes.filter((n) => n.status === 'todo');
  const entryCount = file.nodes.reduce((s, n) => s + (n.entries?.length ?? 0), 0);

  return (
    <div className="traj-scroll" data-dsh-plugin="dsh-trajectory" data-dsh-part="trajectory-list" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 12px 14px' }}>
      <TrajStyles />

      {/* 研究问题卡 */}
      <div style={{
        borderRadius: 11, padding: '10px 12px', marginBottom: 12,
        border: '1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4d6bfe) 30%, transparent)',
        background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4d6bfe) 7%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Icon d={Icons.bulb} size={13} color={T.business} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: T.business }}>{t('digest.question')}</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.55, color: 'var(--dsw-alias-label-primary)' }}>
          {file.project.researchQuestion || file.project.description || t('digest.questionEmpty')}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 9.5, color: T.caption, fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap' }}>
          <span>{file.nodes.length} {t('digest.units.nodes')}</span>
          <span>{mainline.length} {t('digest.units.mainline')}</span>
          <span>{entryCount} {t('digest.units.entries')}</span>
          <span>{t(STATUS_LABELS.in_progress)} {file.nodes.filter((n) => n.status === 'in_progress').length}</span>
          <span>{t(STATUS_LABELS.blocked)} {file.nodes.filter((n) => n.status === 'blocked').length}</span>
        </div>
      </div>

      {/* 主线里程碑时间线 */}
      {mainline.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span aria-hidden style={{ width: 3.4, height: 11, borderRadius: 1.7, background: T.business }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: T.caption }}>{t('digest.mainlineEvo')}</span>
          </div>
          <div style={{ position: 'relative', paddingLeft: 26 }}>
            {/* 时间线脊柱 */}
            <span aria-hidden style={{
              position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, borderRadius: 1,
              background: `color-mix(in srgb, ${T.business} 30%, transparent)`,
            }} />
            {mainline.map((node, i) => {
              const done = node.status === 'done';
              return (
                <div key={node.id} style={{ position: 'relative', marginBottom: 10 }}>
                  {/* 编号圆点 */}
                  <span aria-hidden style={{
                    position: 'absolute', left: -26, top: 4, width: 20, height: 20, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? T.success : node.status === 'in_progress' ? T.business : 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.2))',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    border: `2px solid var(--dsw-alias-bg-base)`,
                    zIndex: 1, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {done ? '✓' : i + 1}
                  </span>
                  {/* 里程碑本身 */}
                  <DigestNode node={node} progress={progress} t={t} onOpen={onOpen} onDelete={onDelete} onDeleteEntry={(eid) => onDeleteEntry(node.id, eid)} defaultOpen />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 分支工作 */}
      {branches.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 12 }}>
            <span aria-hidden style={{ width: 3.4, height: 11, borderRadius: 1.7, background: T.caption }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: T.caption }}>{t('digest.branches')}</span>
          </div>
          {branches.map((n) => (
            <DigestNode key={n.id} node={n} progress={progress} t={t} onOpen={onOpen} onDelete={onDelete} onDeleteEntry={(eid) => onDeleteEntry(n.id, eid)} />
          ))}
        </div>
      )}

      {/* 待办(弱化) */}
      {todos.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--dsw-alias-border-l2)' }}>
          <div style={{ fontSize: 9.5, color: T.caption, marginBottom: 6 }}>{t('digest.todos')}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {todos.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onOpen(n)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--dsw-alias-border-l2)',
                  background: 'transparent', borderRadius: 999, padding: '2px 9px', fontSize: 10,
                  color: T.secondary, cursor: 'pointer', maxWidth: 220, overflow: 'hidden',
                }}
              >
                <span style={{ color: statusColor(n.status), fontSize: 9 }}>{GLYPH[n.kind] ?? '○'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncate(n.title, 24)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {file.nodes.length === 0 && (
        <div style={{ textAlign: 'center', color: T.caption, fontSize: 11.5, padding: '40px 0' }}>
          {t('common.empty')}
        </div>
      )}
    </div>
  );
}
