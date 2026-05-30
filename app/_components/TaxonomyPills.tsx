type Named = { name: string } | null;

export function TaxonomyPills({
  course,
}: {
  course: {
    topicPrimary?: Named;
    topicSecondary?: Named;
    topicTertiary?: Named;
    categoryPrimary?: Named;
    categorySecondary?: Named;
    categoryTertiary?: Named;
  };
}) {
  const topics = [course.topicPrimary, course.topicSecondary, course.topicTertiary].filter(
    (x): x is { name: string } => !!x
  );
  const cats = [
    course.categoryPrimary,
    course.categorySecondary,
    course.categoryTertiary,
  ].filter((x): x is { name: string } => !!x);
  return (
    <>
      {topics.map((t, i) => (
        <span key={`t${i}`} className="badge-pill bg-indigo-100 text-indigo-700">
          {t.name}
        </span>
      ))}
      {cats.map((c, i) => (
        <span key={`c${i}`} className="badge-pill bg-teal-100 text-teal-700">
          {c.name}
        </span>
      ))}
    </>
  );
}

// Standard include for the six ranked taxonomy relations.
export const taxonomyInclude = {
  topicPrimary: true,
  topicSecondary: true,
  topicTertiary: true,
  categoryPrimary: true,
  categorySecondary: true,
  categoryTertiary: true,
} as const;
