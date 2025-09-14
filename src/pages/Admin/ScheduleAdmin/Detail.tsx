import { type ChangeEventHandler, type Dispatch, type SetStateAction } from 'react';
import type { Course, Event, EventDetail } from './Types';
import { refresh, toMinutesIfPresent, validateTimeOptionalPairLabeled } from './helpers';
import { appFetch } from '../../../helpers/apiClient';
import { SERVER_ENDPOINT } from '../../../config/serverEndpoint';
import { pad2 } from '../../../helpers/pad2';

export const EditingDetail = ({
  isNew,
  input,
  handleInput,
  editingDetail,
  setData,
  setEditingDetail
}: {
  isNew?: boolean;
  input: Record<string, string>;
  handleInput: ChangeEventHandler<HTMLInputElement>;
  editingDetail: {
    eventId: number;
    detail: EventDetail | null;
  };
  setData: Dispatch<SetStateAction<Course[]>>;
  setEditingDetail: Dispatch<
    SetStateAction<{
      eventId: number;
      detail: EventDetail | null;
    } | null>
  >;
}) => {
  return (
    <li className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
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
      <div className="flex flex-row gap-4">
        <div className="flex-1">
          <label className="block font-semibold text-gray-700 mb-1">開始時刻</label>
          <div className="flex flex-row gap-2">
            <input
              name="time1Hour"
              value={input.time1Hour || ''}
              onChange={handleInput}
              placeholder="時"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <span className="self-center">:</span>
            <input
              name="time1Minute"
              value={input.time1Minute || ''}
              onChange={handleInput}
              placeholder="分"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
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
            />
            <span className="self-center">:</span>
            <input
              name="time2Minute"
              value={input.time2Minute || ''}
              onChange={handleInput}
              placeholder="分"
              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 mt-2">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          onClick={() => {
            if (!editingDetail || !editingDetail.eventId) return;
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
            // 終了が開始より早い場合はNG（両方揃っているときのみ比較）
            const startMinForDetAdd = toMinutesIfPresent(input.time1Hour, input.time1Minute);
            const endMinForDetAdd = toMinutesIfPresent(input.time2Hour, input.time2Minute);
            if (startMinForDetAdd !== null && endMinForDetAdd !== null && endMinForDetAdd < startMinForDetAdd) {
              alert('終了時刻は開始時刻より後にしてください');
              return;
            }
            const eventId = editingDetail.eventId;
            const payload = {
              memo: input.memo,
              time1Hour: input.time1Hour,
              time1Minute: input.time1Minute,
              time2Hour: input.time2Hour,
              time2Minute: input.time2Minute
            };
            appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${eventId}/details`, { method: 'POST', requiresAuth: true, jsonBody: payload })
              .then(() => refresh(setData))
              .then(() => setEditingDetail(null))
              .catch((e) => console.error(e));
          }}>
          {isNew ? '追加' : '更新'}
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingDetail(null)}>
          キャンセル
        </button>
      </div>
    </li>
  );
};

export const DetailCard = ({ detail }: { detail: EventDetail }) => {
  // 時刻表示用
  const hasStart = detail.time1Hour !== undefined && detail.time1Minute !== undefined && detail.time1Hour !== null && detail.time1Minute !== null;
  const hasEnd = detail.time2Hour !== undefined && detail.time2Minute !== undefined && detail.time2Hour !== null && detail.time2Minute !== null;
  const noTime = !hasStart && !hasEnd;
  return (
    <div className="flex items-center gap-2 text-gray-700 bg-blue-100/40 rounded px-2 py-1">
      <svg className="w-3 h-3 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="font-semibold">{detail.memo}</span>
      <span className="text-xs text-gray-500">
        {noTime
          ? ''
          : `（${hasStart ? `${detail.time1Hour}:${pad2(detail.time1Minute)}` : ''}
        ${hasEnd ? ` - ${detail.time2Hour}:${pad2(detail.time2Minute)}` : ''}）`}
      </span>
    </div>
  );
};

export const DetailButtons = ({
  setEditingDetail,
  setInput,
  detail,
  event,
  setData
}: {
  setEditingDetail: Dispatch<
    SetStateAction<{
      eventId: number;
      detail: EventDetail | null;
    } | null>
  >;
  setInput: Dispatch<SetStateAction<Record<string, string>>>;
  detail: EventDetail;
  event: Event;
  setData: Dispatch<SetStateAction<Course[]>>;
}) => {
  return (
    <div className="flex flex-row flex-wrap gap-2 mt-1">
      <button
        className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
        onClick={() => {
          setEditingDetail({ eventId: event.id, detail });
          setInput({
            memo: detail.memo ?? '',
            time1Hour: detail.time1Hour?.toString() ?? '',
            time1Minute: detail.time1Minute?.toString() ?? '',
            time2Hour: detail.time2Hour?.toString() ?? '',
            time2Minute: detail.time2Minute?.toString() ?? ''
          });
        }}>
        編集
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
        onClick={() => {
          if (!window.confirm('削除してもよろしいですか?')) return;
          appFetch(`${SERVER_ENDPOINT}/api/schedules/event-details/${detail.id}`, { method: 'DELETE', requiresAuth: true })
            .then(() => refresh(setData))
            .catch((e) => console.error(e));
        }}>
        削除
      </button>
    </div>
  );
};
