export function ResultMessage({
  result,
}: {
  result: { error?: string; success?: string };
}) {
  return result.error ? (
    <p className="notice error" role="alert">
      {result.error}
    </p>
  ) : result.success ? (
    <p className="notice success" role="status">
      {result.success}
    </p>
  ) : null;
}
