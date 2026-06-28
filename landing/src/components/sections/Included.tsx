export default function Included() {
  const items = [
    "Complete eCommerce Dashboard",
    "Product, Orders & Customers Pages",
    "Analytics & Charts",
    "Authentication Pages",
    "Light & Dark Mode",
    "Clean Folder Structure",
    "Reusable Components",
    "Documentation",
    "Future Free Updates",
  ]

  return (
    <section className="py-24 bg-gray-50" id="included">
      <div className="container-custom">

        <h2 className="text-4xl font-bold text-center">
          What You Get
        </h2>

        <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-white p-6 rounded-2xl border"
            >
              <span className="text-green-500 text-xl">✔</span>
              <span className="text-gray-700 font-medium">
                {item}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}