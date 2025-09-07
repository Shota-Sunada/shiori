import { type FC } from 'react';
import type { StudentDTO } from '../helpers/domainApi';

interface StudentCardContentProps {
  student: Pick<StudentDTO, 'class' | 'number' | 'surname' | 'forename' | 'surname_kana' | 'forename_kana'>;
}

const StudentCardContent: FC<StudentCardContentProps> = ({ student }) => {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="basis-[10%]">{`${student.class}組`}</div>
      <div className="basis-[10%]">{`${student.number}番`}</div>
      <div className="basis-[35%] font-bold pl-3">{`${student.surname} ${student.forename}`}</div>
      <div className="basis-[45%] text-[#555] text-sm">{`${student.surname_kana} ${student.forename_kana}`}</div>
    </div>
  );
};

export default StudentCardContent;
