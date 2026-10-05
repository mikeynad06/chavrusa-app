import { Link } from 'react-router-dom';
import { SHOW_HASKAMAS } from '../config/features';
import ReportProblemLink from './ReportProblemLink';

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink text-neutral-on-dark">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-6 py-11">
        <span className="font-serif text-[18px] text-[#e8dfcc]">Chavrusa</span>
        <div className="flex flex-wrap gap-[22px] text-[14px]">
          <Link to="/about" className="text-neutral-on-dark hover:text-[#e8dfcc]">
            About
          </Link>
          {SHOW_HASKAMAS && (
            <Link to="/haskamas" className="text-neutral-on-dark hover:text-[#e8dfcc]">
              Haskamas
            </Link>
          )}
          <Link to="/dashboard" className="text-neutral-on-dark hover:text-[#e8dfcc]">
            Dashboard
          </Link>
          <ReportProblemLink className="text-neutral-on-dark hover:text-[#e8dfcc]" />
        </div>
        <span className="font-mono text-[11.5px]">Free to use · always</span>
      </div>
    </footer>
  );
}
