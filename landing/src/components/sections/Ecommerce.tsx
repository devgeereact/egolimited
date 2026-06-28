export default function Ecommerce() {
  return (
    <section id="ecommerce" className="py-24 bg-gray-50">
      <div className="container-custom grid md:grid-cols-2 gap-16 items-center">

        {/* Text Content */}
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Complete eCommerce <br /> Management System
          </h2>

          <p className="mt-6 text-gray-600 text-lg leading-relaxed">
            Manage products, orders, customers and analytics with a clean,
            modern ShadCN powered interface.
          </p>

          <ul className="mt-8 space-y-4 text-gray-700">
            <li>✔ Product Listing & Add Product</li>
            <li>✔ Orders Management</li>
            <li>✔ Customer Management</li>
            <li>✔ Sales Reports</li>
            <li>✔ Invoice Pages</li>
            <li>✔ Inventory Tracking</li>
          </ul>
        </div>

        {/* Mock Preview Box */}
        <div className="relative rounded-2xl border bg-white shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />

          <div className="h-88 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-lg">
            <img src="/pulse-ui/landing-page/images/ecommerce-management.png"/>
          </div>
        </div>

      </div>
    </section>
  )
}