import { type FC } from 'react';
import type { StudentDTO } from '../helpers/domainApi';
import { pad2 } from '../helpers/pad2';

interface StudentCardContentProps {
  student: Pick<StudentDTO, 'class' | 'number' | 'surname' | 'forename' | 'surname_kana' | 'forename_kana'>;
}

const StudentCardContent: FC<StudentCardContentProps> = ({ student }) => {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="basis-[10%]">{`5${student.class}${pad2(student.number)}`}</div>
      <div className="basis-[50%] font-bold ml-2">{`${student.surname} ${student.forename}`}</div>
      <div className="basis-[40%] text-[#555] text-sm flex flex-col">
        <p>{student.surname_kana}</p>
        <p>{student.forename_kana}</p>
      </div>
    </div>
  );
};

export default StudentCardContent;
