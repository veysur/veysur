import React from 'react'

// Centres a toggle control (RadioGroupItem/Checkbox) within its slot. Needed
// because Checkbox/RadioGroupItem carry their own `display:flex` class, which
// defeats a parent's `justify-center`/`text-align: center` on the control
// itself - wrapping in a plain flex div restores centring.
export const ToggleCell: React.FC<{
  width?: string
  children: React.ReactNode
}> = ({ width, children }) => (
  <div
    className={`flex justify-center ${width ? `${width} shrink-0` : ''}`.trim()}
  >
    {children}
  </div>
)
