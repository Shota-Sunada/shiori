import React from 'react';
import type { student } from '../data/students';

interface StudentCardContentProps {
  student: student;
}

const StudentCardContent: React.FC<StudentCardContentProps> = ({ student }) => {
  return (
    <div className="flex items-baseline w-full">
      <div className="basis-[8%]">{`${student.class}組`}</div>
      <div className="basis-[8%]">{`${student.number}番`}</div>
      <div className="basis-[35%] font-bold pl-3">{`${student.surname} ${student.forename}`}</div>
      <div className="basis-[45%] text-[#555] text-sm">{`${student.surname_kana} ${student.forename_kana}`}</div>
    </div>
  );
};

export default StudentCardContent;
