'use client'

import Logo from './Logo'

interface ProductDisplayProps {
  lookupKey: string
}

const ProductDisplay = ({ lookupKey }: ProductDisplayProps) => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lookup_key: lookupKey }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong')
    }
  }

  return (
    <section>
      <div className="product">
        <Logo />
        <div className="description">
          <h3>Starter Plan</h3>
          <h5>$20.00 / month</h5>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="lookup_key" value={lookupKey} />
        <button id="checkout-and-portal-button" type="submit">
          Checkout
        </button>
      </form>
    </section>
  )
}

export default ProductDisplay


