import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import '../styles/student-modal.css';
import MDButton from './MDButton';
import Modal from './Modal';

// フォームデータ型
export interface StudentFormData {
  surname: string;
  forename: string;
  surname_kana: string;
  forename_kana: string;
  class: string; // 入力中は文字列（number型にすると空文字を扱いにくいため）
  number: string;
  gakuseki: string;
  day1id: string;
  day3id: string;
  day1bus: string;
  day3bus: string;
  room_fpr: number | '';
  room_tdh: number | '';
  shinkansen_day1_car_number: string;
  shinkansen_day4_car_number: string;
  shinkansen_day1_seat: string;
  shinkansen_day4_seat: string;
}

const localInitialForm: StudentFormData = {
  surname: '',
  forename: '',
  surname_kana: '',
  forename_kana: '',
  class: '',
  number: '',
  gakuseki: '',
  day1id: 'yrp_nifco',
  day3id: 'okutama',
  day1bus: '',
  day3bus: '',
  room_fpr: '',
  room_tdh: '',
  shinkansen_day1_car_number: '',
  shinkansen_day4_car_number: '',
  shinkansen_day1_seat: '',
  shinkansen_day4_seat: ''
};

interface StudentModalProps {
  open: boolean;
  onSave: (formData: StudentFormData) => void;
  onCancel: () => void;
  day1idOptions: string[];
  day3idOptions: string[];
  initialData?: StudentFormData | null;
  mode: 'add' | 'edit';
}

const StudentModal = ({ open, onSave, onCancel, day1idOptions, day3idOptions, initialData, mode }: StudentModalProps) => {
  const [form, setForm] = useState<StudentFormData>(initialData || localInitialForm);
  const [touched, setTouched] = useState(false);

  // 必須項目のバリデーション
  const isValid = useMemo(() => {
    return (
      form.gakuseki.trim() !== '' &&
      form.surname.trim() !== '' &&
      form.forename.trim() !== '' &&
      form.class.trim() !== '' &&
      form.number.trim() !== '' &&
      form.day1id.trim() !== '' &&
      form.day3id.trim() !== ''
    );
  }, [form]);

  // モーダルが開いた時に初期化
  useEffect(() => {
    if (open) {
      setForm(initialData || localInitialForm);
      setTouched(false);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched(true);
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numeric = value === '' ? '' : Number(value);
    setForm((prev) => ({ ...prev, [name]: numeric }));
    setTouched(true);
  };

  const handleSave = () => {
    if (!isValid) return;
    const cleaned: StudentFormData = {
      ...form,
      surname: form.surname.trim(),
      forename: form.forename.trim(),
      surname_kana: form.surname_kana.trim(),
      forename_kana: form.forename_kana.trim(),
      gakuseki: form.gakuseki.trim(),
      class: form.class.trim(),
      number: form.number.trim()
    };
    onSave(cleaned);
  };

  const handleCancel = () => {
    onCancel();
  };

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={handleCancel}
      ariaLabelledBy="student-modal-title"
      className="border bg-white text-black rounded-xl px-[5dvw] py-[5dvh] min-w-[350px] max-h-[90dvh] overflow-y-auto m-[10px] shadow-lg"
      overlayClassName="p-2"
      initialFocusRef={firstInputRef as unknown as React.RefObject<HTMLElement>}
      closeOnEsc={false}
      closeOnOverlayClick={false}>
      <h2 className="mb-4 font-bold text-lg" id="student-modal-title">
        {mode === 'add' ? '生徒データ新規追加' : '生徒データ編集'}
      </h2>
      <div className="grid grid-cols-2 gap-2 modal-root text-sm items-center justify-center">
        <label htmlFor="gakuseki">{'学籍番号'}</label>
        <input ref={firstInputRef} id="gakuseki" name="gakuseki" value={form.gakuseki} onChange={handleChange} required />

        <label htmlFor="surname">{'姓'}</label>
        <input id="surname" name="surname" value={form.surname} onChange={handleChange} required />

        <label htmlFor="forename">{'名'}</label>
        <input id="forename" name="forename" value={form.forename} onChange={handleChange} required />

        <label htmlFor="class">{'組'}</label>
        <input id="class" name="class" type="number" min={1} max={7} value={form.class} onChange={handleChange} required />

        <label htmlFor="number">{'番号'}</label>
        <input id="number" name="number" type="number" min={1} max={41} value={form.number} onChange={handleChange} required />

        <label htmlFor="day1id">{'一日目研修先'}</label>
        <select id="day1id" name="day1id" value={form.day1id} required onChange={handleChange}>
          {day1idOptions.map((opt) => (
            <option key={opt} value={opt}>
              {COURSES_DAY1.find((x) => x.key === opt)?.name || opt}
            </option>
          ))}
        </select>

        <label htmlFor="day3id">{'三日目研修先'}</label>
        <select id="day3id" name="day3id" value={form.day3id} required onChange={handleChange}>
          {day3idOptions.map((opt) => (
            <option key={opt} value={opt}>
              {COURSES_DAY3.find((x) => x.key === opt)?.name || opt}
            </option>
          ))}
        </select>

        <label htmlFor="day1bus">{'一日目バス'}</label>
        <input id="day1bus" name="day1bus" value={form.day1bus} required onChange={handleChange} />

        <label htmlFor="day3bus">{'三日目バス'}</label>
        <input id="day3bus" name="day3bus" value={form.day3bus} required onChange={handleChange} />

        <label htmlFor="room_tdh">{'東京ドームホテル 号室'}</label>
        <input id="room_tdh" name="room_tdh" value={form.room_tdh} required onChange={handleNumericChange} />

        <label htmlFor="room_fpr">{'ﾌｼﾞﾌﾟﾚﾐｱﾑﾘｿﾞｰﾄ 号室'}</label>
        <input id="room_fpr" name="room_fpr" value={form.room_fpr} required onChange={handleNumericChange} />

        <label>{'一日目 新幹線'}</label>
        <div className="flex flex-row gap-2">
          <div className="flex flex-row items-center">
            <input name="shinkansen_day1_car_number" value={form.shinkansen_day1_car_number} type="number" min={1} max={16} required onChange={handleChange} className="w-8" />
            <span className="px-1">{'号車'}</span>
          </div>
          <input className="w-full" name="shinkansen_day1_seat" value={form.shinkansen_day1_seat} required onChange={handleChange} placeholder="座席(A1など)" />
        </div>

        <label>{'四日目 新幹線'}</label>
        <div className="flex flex-row gap-2">
          <div className="flex flex-row items-center">
            <input name="shinkansen_day4_car_number" value={form.shinkansen_day4_car_number} type="number" min={1} max={16} required onChange={handleChange} className="w-8" />
            <span className="px-1">{'号車'}</span>
          </div>
          <input className="w-full" name="shinkansen_day4_seat" value={form.shinkansen_day4_seat} required onChange={handleChange} placeholder="座席(A1など)" />
        </div>
      </div>
      <div className="flex flex-row items-center justify-center mt-6 gap-2">
        <MDButton text="キャンセル" onClick={handleCancel} width="mobiry-button-150" />
        <div className="opacity-60 text-xs px-2">{!isValid && touched ? '未入力の必須項目があります' : ''}</div>
        <MDButton text="保存" onClick={handleSave} arrowRight disabled={!isValid} width="mobiry-button-150" />
      </div>
    </Modal>
  );
};

export default StudentModal;
