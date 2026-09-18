import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/seller/products')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/seller/products"!</div>
}
