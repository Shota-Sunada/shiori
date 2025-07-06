import React, { useState, useEffect } from 'react';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';

const localInitialForm = {
  surname: '',
  forename: '',
  class: '',
  number: '',
  gakuseki: '',
  day1id: 'yrp_nifco',
  day3id: 'okutama',
  day1bus: '',
  day3bus: '',
  room_shizuoka: '',
  room_tokyo: ''
};

type StudentFormData = typeof localInitialForm;

const StudentModal = ({
  open,
  onSave,
  onCancel,
  day1idOptions,
  day3idOptions,
  initialData,
  mode
}: {
  open: boolean;
  onSave: (formData: StudentFormData) => void;
  onCancel: () => void;
  day1idOptions: string[];
  day3idOptions: string[];
  initialData?: StudentFormData | null;
  mode: 'add' | 'edit';
}) => {
  const [form, setForm] = useState(initialData || localInitialForm);

  useEffect(() => {
    if (open) {
      setForm(initialData || localInitialForm);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(form);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="border bg-white text-black rounded-xl px-[5dvw] py-[5dvh] min-w-[350px] max-h-[90dvh] overflow-y-auto">
        <h2 className="mb-4">{mode === 'add' ? '生徒データ新規追加' : '生徒データ編集'}</h2>
        <div className="grid grid-cols-2 gap-2">
          <label>学籍番号</label>
          <input name="gakuseki" value={form.gakuseki} onChange={handleChange} required />
          <label>姓</label>
          <input name="surname" value={form.surname} onChange={handleChange} required />
          <label>名</label>
          <input name="forename" value={form.forename} onChange={handleChange} required />
          <label>組</label>
          <input name="class" type="number" min={1} max={7} value={form.class} onChange={handleChange} required />
          <label>番号</label>
          <input name="number" type="number" min={1} max={41} value={form.number} onChange={handleChange} required />
          <label>一日目研修先</label>
          <select name="day1id" value={form.day1id} required onChange={handleChange}>
            {day1idOptions.map((opt) => (
              <option key={opt} value={opt}>
                {COURSES_DAY1.find((x) => x.key == opt)?.name}
              </option>
            ))}
          </select>
          <label>三日目研修先</label>
          <select name="day3id" value={form.day3id} required onChange={handleChange}>
            {day3idOptions.map((opt) => (
              <option key={opt} value={opt}>
                {COURSES_DAY3.find((x) => x.key == opt)?.name}
              </option>
            ))}
          </select>
          <label>一日目バス</label>
          <input name="day1bus" value={form.day1bus} required onChange={handleChange} />
          <label>三日目バス</label>
          <input name="day3bus" value={form.day3bus} required onChange={handleChange} />
          <label>東京ドームホテル 号室</label>
          <input name="room_tokyo" value={form.room_tokyo} required onChange={handleChange} />
          <label>静岡 ホテル 号室</label>
          <input name="room_shizuoka" value={form.room_shizuoka} required onChange={handleChange} />
        </div>
        <div className="flex flex-row items-center justify-center mt-4">
          <button className="cursor-pointer m-2 bg-blue-400 text-white rounded-2xl p-2 min-w-[5dvw]" onClick={handleSave}>
            {'保存'}
          </button>
          <button className="cursor-pointer m-2 bg-gray-300 text-black rounded-2xl p-2 min-w-[5dvw]" onClick={handleCancel}>
            {'キャンセル'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentModal;
