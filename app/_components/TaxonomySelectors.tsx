type Item = { id: number; name: string };
type CourseTaxo = {
  topicPrimaryId: number | null;
  topicSecondaryId: number | null;
  topicTertiaryId: number | null;
  categoryPrimaryId: number | null;
  categorySecondaryId: number | null;
  categoryTertiaryId: number | null;
};

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: number | null;
  options: Item[];
}) {
  return (
    <div>
      <label className="mb-0.5 block text-xs text-slate-500">{label}</label>
      <select name={name} defaultValue={value ?? ""} className="input">
        <option value="">— aucun —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TaxonomySelectors({
  topics,
  categories,
  course,
}: {
  topics: Item[];
  categories: Item[];
  course: CourseTaxo;
}) {
  return (
    <>
      <div className="space-y-2">
        <span className="label">Type d&apos;activité</span>
        <Select name="topicPrimaryId" label="Principal" value={course.topicPrimaryId} options={topics} />
        <Select name="topicSecondaryId" label="Secondaire" value={course.topicSecondaryId} options={topics} />
        <Select name="topicTertiaryId" label="Tertiaire" value={course.topicTertiaryId} options={topics} />
      </div>
      <div className="space-y-2">
        <span className="label">Domaine de la loi</span>
        <Select name="categoryPrimaryId" label="Principal" value={course.categoryPrimaryId} options={categories} />
        <Select name="categorySecondaryId" label="Secondaire" value={course.categorySecondaryId} options={categories} />
        <Select name="categoryTertiaryId" label="Tertiaire" value={course.categoryTertiaryId} options={categories} />
      </div>
    </>
  );
}
