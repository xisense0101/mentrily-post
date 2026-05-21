import type { MediaFileCategoryContract } from '../../types';

const categories: MediaFileCategoryContract[] = ['DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'ARCHIVE', 'OTHER'];

interface MediaFileCategorySelectProps {
  value?: MediaFileCategoryContract | '';
  onChange(value: MediaFileCategoryContract | ''): void;
}

export function MediaFileCategorySelect({ value = '', onChange }: MediaFileCategorySelectProps) {
  return (
    <label style={{ display: 'grid', gap: '0.35rem' }}>
      <span>Filter category</span>
      <select value={value} onChange={(event) => onChange(event.target.value as MediaFileCategoryContract | '')}>
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}
