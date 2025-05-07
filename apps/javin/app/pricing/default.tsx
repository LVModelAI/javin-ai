export default async function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <div className="w-screen h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    </>
  );
}
