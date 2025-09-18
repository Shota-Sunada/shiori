import type { SetStateAction, Dispatch, ChangeEventHandler } from 'react';
import { SERVER_ENDPOINT } from '../../../config/serverEndpoint';
import { appFetch } from '../../../helpers/apiClient';
import { refresh } from './helpers';
import type { Course, Event, Schedule } from './Types';

export const EditingSchedule = ({
  isNew,
  input,
  handleInput,
  editingSchedule,
  setEditingSchedule,
  setData
}: {
  isNew?: boolean;
  input: Record<string, string>;
  handleInput: ChangeEventHandler<HTMLInputElement>;
  editingSchedule: {
    courseId: number;
    schedule: Schedule | null;
  };
  setEditingSchedule: Dispatch<
    SetStateAction<{
      courseId: number;
      schedule: Schedule | null;
    } | null>
  >;
  setData: Dispatch<SetStateAction<Course[]>>;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-1">
      <div>
        <label className="block font-semibold text-gray-700 mb-1">タイトル</label>
        <input
          name="title"
          value={input.title || ''}
          onChange={handleInput}
          placeholder="タイトル"
          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex flex-row gap-2 mt-2">
        {isNew ? (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            onClick={() => {
              if (!editingSchedule || !editingSchedule.courseId) return;
              if (!input.title || !input.title.trim()) {
                alert('タイトルは必須です');
                return;
              }
              const payload = { courseId: editingSchedule.courseId, title: input.title.trim() };
              appFetch(`${SERVER_ENDPOINT}/api/schedules`, { method: 'POST', requiresAuth: true, jsonBody: payload })
                .then(() => refresh(setData))
                .then(() => setEditingSchedule(null))
                .catch((e) => {
                  alert(`スケジュール作成に失敗しました: ${e.message}`);
                  console.error(e);
                });
            }}>
            追加
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => {
              if (!editingSchedule?.schedule) return;
              if (!input.title || !input.title.trim()) {
                alert('タイトルは必須です');
                return;
              }
              const id = editingSchedule.schedule.id;
              const payload = { title: input.title.trim() };
              appFetch(`${SERVER_ENDPOINT}/api/schedules/${id}`, { method: 'PUT', requiresAuth: true, jsonBody: payload })
                .then(() => refresh(setData))
                .then(() => setEditingSchedule(null))
                .catch((e) => {
                  alert(`スケジュール更新に失敗しました: ${e.message}`);
                  console.error(e);
                });
            }}>
            保存
          </button>
        )}
        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingSchedule(null)}>
          キャンセル
        </button>
      </div>
    </div>
  );
};

export const ScheduleCard = ({ schedule }: { schedule: Schedule }) => {
  return (
    <h3 className="font-bold text-blue-900 text-base md:text-lg flex items-center gap-1">
      <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {schedule.title}
    </h3>
  );
};

export const ScheduleButtons = ({
  setEditingSchedule,
  setInput,
  course,
  schedule,
  setData,
  setEditingEvent
}: {
  setEditingSchedule: Dispatch<
    SetStateAction<{
      courseId: number;
      schedule: Schedule | null;
    } | null>
  >;
  setInput: Dispatch<SetStateAction<Record<string, string>>>;
  course: Course;
  schedule: Schedule;
  setData: Dispatch<SetStateAction<Course[]>>;
  setEditingEvent: Dispatch<
    SetStateAction<{
      scheduleId: number;
      event: Event | null;
    } | null>
  >;
}) => {
  return (
    <div className="flex flex-row flex-wrap gap-2 mb-1">
      <button
        className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
        onClick={() => {
          setEditingSchedule({ courseId: course.id, schedule });
          setInput({ title: schedule.title });
        }}>
        編集
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
        onClick={() => {
          if (!window.confirm('削除してもよろしいですか?')) return;
          appFetch(`${SERVER_ENDPOINT}/api/schedules/${schedule.id}`, { method: 'DELETE', requiresAuth: true })
            .then(() => refresh(setData))
            .catch((e) => console.error(e));
        }}>
        削除
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-blue-400 rounded"
        onClick={() => {
          setEditingEvent({ scheduleId: schedule.id, event: null });
          setInput({ memo: '', time1Hour: '', time1Minute: '', time1Postfix: '', time2Hour: '', time2Minute: '', time2Postfix: '' });
        }}>
        ＋イベント追加
      </button>
    </div>
  );
};
