export default function TechStack() {
  const stack = [
    "React 18+",
    "TypeScript",
    "ShadCN UI",
    "Tailwind CSS",
    "Radix UI",
    "Vite",
    "Lucide Icons",
    "Fully Responsive",
  ]

  return (
    <section id="tech" className="py-24 bg-white">
      <div className="container-custom text-center">

        <h2 className="text-4xl font-bold">
          Built With Modern Technologies
        </h2>

        <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
          Pulse UI uses a modern tech stack focused on performance,
          scalability and developer experience.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {stack.map((item, index) => (
            <div
              key={index}
              className="px-6 py-3 border rounded-full text-sm font-medium hover:bg-gray-100 transition"
            >
              {item}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}