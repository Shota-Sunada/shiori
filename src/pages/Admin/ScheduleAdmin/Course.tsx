import type { Dispatch, SetStateAction } from 'react';
import { SERVER_ENDPOINT } from '../../../config/serverEndpoint';
import { appFetch } from '../../../helpers/apiClient';
import { refresh } from './helpers';
import type { Course, Schedule } from './Types';
import { isOffline } from '../../../helpers/isOffline';

export const EditingCourse = ({ course, setEditingCourse }: { course: Course; setEditingCourse: Dispatch<SetStateAction<Course | null>> }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-1">
      <div className="text-sm mb-2 text-gray-600">コースマスタに基づくため、既存コースのキーは変更できません。</div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700">コースキー:</span> {course.course_key}
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700">コース名:</span> {course.name}
      </div>
      <div className="flex flex-row gap-2 mt-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" onClick={() => setEditingCourse(null)}>
          閉じる
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingCourse(null)}>
          キャンセル
        </button>
      </div>
    </div>
  );
};

export const NewCourse = ({
  input,
  ALL_COURSES,
  setInput,
  selectableCourses,
  saving,
  setSaving,
  setData,
  setEditingCourse
}: {
  input: Record<string, string>;
  ALL_COURSES: {
    key: string;
    name: string;
  }[];
  setInput: Dispatch<SetStateAction<Record<string, string>>>;
  selectableCourses: {
    key: string;
    name: string;
  }[];
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setData: Dispatch<SetStateAction<Course[]>>;
  setEditingCourse: Dispatch<SetStateAction<Course | null>>;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-1">
      <div>
        <label className="block font-semibold text-gray-700 mb-1">コース</label>
        <select
          name="course_key"
          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={input.course_key || ''}
          onChange={(e) => {
            const key = e.target.value;
            const selected = ALL_COURSES.find((c) => c.key === key);
            setInput({ course_key: key, name: selected?.name ?? '' });
          }}>
          {selectableCourses.length === 0 && <option value="">追加可能なコースはありません</option>}
          {selectableCourses.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-row gap-2 mt-2">
        <button
          className={`px-4 py-2 rounded ${input.course_key ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
          disabled={!input.course_key || saving}
          onClick={async () => {
            if (!input.course_key) return;
            if (isOffline()) return;
            try {
              setSaving(true);
              await appFetch(`${SERVER_ENDPOINT}/api/schedules/courses`, {
                method: 'POST',
                requiresAuth: true,
                jsonBody: { course_key: input.course_key, name: input.name }
              });
              await refresh(setData);
              setEditingCourse(null);
              setInput({});
            } catch (e) {
              console.error(e);
            } finally {
              setSaving(false);
            }
          }}>
          {saving ? '追加中…' : '追加'}
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingCourse(null)}>
          キャンセル
        </button>
      </div>
    </div>
  );
};

export const CourseButtons = ({
  setEditingCourse,
  course,
  setInput,
  setData,
  setEditingSchedule
}: {
  setEditingCourse: Dispatch<SetStateAction<Course | null>>;
  course: Course;
  setInput: Dispatch<SetStateAction<Record<string, string>>>;
  setData: Dispatch<SetStateAction<Course[]>>;
  setEditingSchedule: Dispatch<
    SetStateAction<{
      courseId: number;
      schedule: Schedule | null;
    } | null>
  >;
}) => {
  return (
    <div className="flex flex-row flex-wrap gap-2 mb-2">
      <button
        className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
        onClick={() => {
          setEditingCourse(course);
          setInput({ course_key: course.course_key ?? '', name: course.name ?? '' });
        }}>
        編集
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
        onClick={() => {
          if (!window.confirm('削除してもよろしいですか?')) return;
          appFetch(`${SERVER_ENDPOINT}/api/schedules/courses/${course.id}`, { method: 'DELETE', requiresAuth: true })
            .then(() => refresh(setData))
            .catch((e) => console.error(e));
        }}>
        削除
      </button>
      <button
        className="text-xs px-2 py-1 mx-1 bg-blue-400 rounded"
        onClick={() => {
          setEditingSchedule({ courseId: course.id, schedule: null });
          setInput({ title: '' });
        }}>
        ＋スケジュール追加
      </button>
    </div>
  );
};
