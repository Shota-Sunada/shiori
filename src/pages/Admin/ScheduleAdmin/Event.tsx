import type { ChangeEventHandler, Dispatch, SetStateAction } from 'react';
import { pad2 } from '../../../helpers/pad2';
import type { Course, Event, EventDetail, Schedule } from './Types';
import { refresh, toMinutesIfPresent, validateTimeOptionalPairLabeled, validateTimeRequired, validateTimeOptionalPair } from './helpers';
import { SERVER_ENDPOINT } from '../../../config/serverEndpoint';
import { appFetch } from '../../../helpers/apiClient';
import { useState } from 'react';

export const EditingEvent = ({
  isNew,
  input,
  handleInput,
  editingEvent,
  setData,
  setEditingEvent
}: {
  isNew?: boolean;
  input: Record<string, string>;
  handleInput: ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  editingEvent: {
    scheduleId: number;
    event: Event | null;
  } | null;
  setData: Dispatch<SetStateAction<Course[]>>;
  setEditingEvent: Dispatch<
    SetStateAction<{
      scheduleId: number;
      event: Event | null;
    } | null>
  >;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100">
      <div>
        <label className="block font-semibold text-gray-700 mb-1">メモ</label>
        <input
          name="memo"
          value={input.memo || ''}
          onChange={handleInput}
          placeholder="メモ"
          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex-1">
          <label className="block font-semibold text-gray-700 mb-1">開始時刻</label>
          <div className="flex flex-row gap-2">
            <input
              name="time1Hour"
              value={input.time1Hour || ''}
              onChange={handleInput}
              placeholder="時"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
              inputMode="numeric"
              pattern="\\d*"
            />
            <span className="self-center">:</span>
            <input
              name="time1Minute"
              value={input.time1Minute || ''}
              onChange={handleInput}
              placeholder="分"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
              inputMode="numeric"
              pattern="\\d*"
            />
            <select
              name="time1Postfix"
              value={input.time1Postfix || ''}
              onChange={handleInput}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">(なし)</option>
              <option value="発">発</option>
              <option value="着">着</option>
            </select>
          </div>
        </div>
        <div className="flex-1">
          <label className="block font-semibold text-gray-700 mb-1">終了時刻</label>
          <div className="flex flex-row gap-2">
            <input
              name="time2Hour"
              value={input.time2Hour || ''}
              onChange={handleInput}
              placeholder="時"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
              inputMode="numeric"
              pattern="\\d*"
            />
            <span className="self-center">:</span>
            <input
              name="time2Minute"
              value={input.time2Minute || ''}
              onChange={handleInput}
              placeholder="分"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
              inputMode="numeric"
              pattern="\\d*"
            />
            <select
              name="time2Postfix"
              value={input.time2Postfix || ''}
              onChange={handleInput}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">(なし)</option>
              <option value="発">発</option>
              <option value="着">着</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 mt-2">
        {isNew ? (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            onClick={() => {
              if (!editingEvent || !editingEvent.scheduleId) return;
              const memo = (input.memo || '').trim();
              if (!memo) {
                alert('メモは必須です');
                return;
              }
              if (!validateTimeRequired(input.time1Hour, input.time1Minute)) {
                alert('開始時刻が不正です（時は0–23、分は0–59）');
                return;
              }
              const opt2 = validateTimeOptionalPair(input.time2Hour, input.time2Minute);
              if (!opt2.ok) {
                alert(opt2.msg!);
                return;
              }
              // 終了が開始より早い場合はNG
              const startMinForEvAdd = toMinutesIfPresent(input.time1Hour, input.time1Minute);
              const endMinForEvAdd = toMinutesIfPresent(input.time2Hour, input.time2Minute);
              if (endMinForEvAdd !== null && startMinForEvAdd !== null && endMinForEvAdd < startMinForEvAdd) {
                alert('終了時刻は開始時刻より後にしてください');
                return;
              }
              const scheduleId = editingEvent.scheduleId;
              const payload = {
                memo: input.memo,
                time1Hour: input.time1Hour,
                time1Minute: input.time1Minute,
                time1Postfix: input.time1Postfix ? input.time1Postfix : null,
                time2Hour: input.time2Hour,
                time2Minute: input.time2Minute,
                time2Postfix: input.time2Postfix ? input.time2Postfix : null
              };
              appFetch(`${SERVER_ENDPOINT}/api/schedules/${scheduleId}/events`, { method: 'POST', requiresAuth: true, jsonBody: payload })
                .then(() => refresh(setData))
                .then(() => setEditingEvent(null))
                .catch((e) => console.error(e));
            }}>
            追加
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => {
              if (!editingEvent?.event) return;
              const memo = (input.memo || '').trim();
              if (!memo) {
                alert('メモは必須です');
                return;
              }
              const opt1 = validateTimeOptionalPairLabeled('開始時刻', input.time1Hour, input.time1Minute);
              if (!opt1.ok) {
                alert(opt1.msg!);
                return;
              }
              const opt2 = validateTimeOptionalPairLabeled('終了時刻', input.time2Hour, input.time2Minute);
              if (!opt2.ok) {
                alert(opt2.msg!);
                return;
              }
              // 終了が開始より早い場合はNG
              const startMinForEvSave = toMinutesIfPresent(input.time1Hour, input.time1Minute);
              const endMinForEvSave = toMinutesIfPresent(input.time2Hour, input.time2Minute);
              if (endMinForEvSave !== null && startMinForEvSave !== null && endMinForEvSave < startMinForEvSave) {
                alert('終了時刻は開始時刻より後にしてください');
                return;
              }
              const id = editingEvent.event.id;
              const payload = {
                memo: input.memo,
                time1Hour: input.time1Hour,
                time1Minute: input.time1Minute,
                time1Postfix: input.time1Postfix ? input.time1Postfix : null,
                time2Hour: input.time2Hour,
                time2Minute: input.time2Minute,
                time2Postfix: input.time2Postfix ? input.time2Postfix : null
              };
              appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${id}`, { method: 'PUT', requiresAuth: true, jsonBody: payload })
                .then(() => refresh(setData))
                .then(() => setEditingEvent(null))
                .catch((e) => console.error(e));
            }}>
            保存
          </button>
        )}
        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingEvent(null)}>
          キャンセル
        </button>
      </div>
    </div>
  );
};

// Message編集UI
const MessageEditor = ({ event, setData, showAdd, onClose }: { event: Event; setData: Dispatch<SetStateAction<Course[]>>; showAdd?: boolean; onClose?: () => void }) => {
  const [input, setInput] = useState<{ text: string; type: 'notice' | 'info' | 'important' | 'alert' }>({ text: '', type: 'info' });

  // 追加（複数文対応）
  const handleAdd = () => {
    if (!input.text) return;
    // 改行ごとに分割し、空行を除外
    const lines = input.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return;
    Promise.all(
      lines.map((line) =>
        appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}/messages`, {
          method: 'POST',
          requiresAuth: true,
          jsonBody: { text: line, type: input.type }
        })
      )
    ).then(() => {
      setInput({ text: '', type: 'info' });
      refresh(setData);
      if (onClose) onClose();
    });
  };

  return (
    <div className="ml-2 mt-2 mb-2">
      {showAdd && (
        <div className="flex gap-2 mb-2 items-start">
          <textarea
            className="border rounded px-2 py-1 w-64 h-20 resize-y"
            placeholder="メッセージ内容（複数行で複数文追加可）"
            value={input.text}
            onChange={(e) => setInput((i) => ({ ...i, text: e.target.value }))}
          />
          <select
            className="border rounded px-2 py-1 mt-1"
            value={input.type}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'notice' || v === 'info' || v === 'important' || v === 'alert') {
                setInput((i) => ({ ...i, type: v }));
              }
            }}>
            <option value="info">詳細</option>
            <option value="notice">注意</option>
            <option value="important">重要</option>
            <option value="alert">警告</option>
          </select>
          <button className="bg-blue-500 text-white rounded px-3 py-1 mt-1" onClick={handleAdd}>
            追加
          </button>
          {onClose && (
            <button className="bg-gray-300 rounded px-3 py-1 mt-1" onClick={onClose}>
              キャンセル
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const EventCard = ({ event, setData }: { event: Event; setData: Dispatch<SetStateAction<Course[]>> }) => {
  const [showAddMessage, setShowAddMessage] = useState(false);
  const hasStart = event.time1Hour !== undefined && event.time1Minute !== undefined && event.time1Hour !== null && event.time1Minute !== null;
  const hasEnd = event.time2Hour !== undefined && event.time2Minute !== undefined && event.time2Hour !== null && event.time2Minute !== null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-700 bg-blue-50 rounded px-2 py-1">
        <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-semibold">{event.memo}</span>
        <span className="text-xs text-gray-500">
          （{hasStart ? `${event.time1Hour}:${pad2(event.time1Minute)}${event.time1Postfix ? ` ${event.time1Postfix}` : ''}` : ''}
          {hasEnd ? ` - ${event.time2Hour}:${pad2(event.time2Minute)}${event.time2Postfix ? ` ${event.time2Postfix}` : ''}` : ''}）
        </span>
        <button className="ml-2 text-xs px-2 py-1 bg-green-400 rounded hover:bg-green-500 transition" onClick={() => setShowAddMessage(true)}>
          Message追加
        </button>
      </div>
      {/* MessageEditorのリストを常時表示し、追加時のみshowAdd=trueで表示 */}
      <MessageEditor event={event} setData={setData} showAdd={showAddMessage} onClose={() => setShowAddMessage(false)} />
    </div>
  );
};

export const EventButtons = ({
  setEditingEvent,
  setInput,
  event,
  setData,
  setEditingDetail,
  schedule
}: {
  setEditingEvent: Dispatch<
    SetStateAction<{
      scheduleId: number;
      event: Event | null;
    } | null>
  >;
  setInput: Dispatch<SetStateAction<Record<string, string>>>;
  event: Event;
  setData: Dispatch<SetStateAction<Course[]>>;
  setEditingDetail: Dispatch<
    SetStateAction<{
      eventId: number;
      detail: EventDetail | null;
    } | null>
  >;
  schedule: Schedule;
}) => {
  return (
    <div className="flex flex-row flex-wrap gap-2 mt-1">
      <button
        className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
        onClick={() => {
          setEditingEvent({ scheduleId: schedule.id, event });
          setInput({
            memo: event.memo ?? '',
            time1Hour: event.time1Hour?.toString() ?? '',
            time1Minute: event.time1Minute?.toString() ?? '',
            time1Postfix: event.time1Postfix ?? '',
            time2Hour: event.time2Hour?.toString() ?? '',
            time2Minute: event.time2Minute?.toString() ?? '',
            time2Postfix: event.time2Postfix ?? ''
          });
        }}>
        編集
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
        onClick={() => {
          if (!window.confirm('削除してもよろしいですか?')) return;
          appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}`, { method: 'DELETE', requiresAuth: true })
            .then(() => refresh(setData))
            .catch((e) => console.error(e));
        }}>
        削除
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-blue-400 rounded"
        onClick={() => {
          setEditingDetail({ eventId: event.id, detail: null });
          setInput({ memo: '', time1Hour: '', time1Minute: '', time2Hour: '', time2Minute: '' });
        }}>
        ＋詳細追加
      </button>
      {/* Message追加ボタンはEventCard内に移動済み */}
    </div>
  );
};
