import { useEffect } from 'react'
import type { Customer, FinanceProject } from '@/types'
import FreelanceCalculator from '.'

interface Props {
  customers:            Customer[]
  onCreateCustomer:     (data: Partial<Customer>) => Promise<Customer>
  onSaveFinanceProject: (data: Partial<FinanceProject>) => Promise<FinanceProject>
}

export default function CalculadoraPage({ customers, onCreateCustomer, onSaveFinanceProject }: Props) {
  useEffect(() => {
    document.title = 'Calculadora Freelance — Bleak\'s Solutions'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', 'Calcula tu tarifa, impuestos y gastos como autónomo en España')
    } else {
      const m = document.createElement('meta')
      m.name = 'description'
      m.content = 'Calcula tu tarifa, impuestos y gastos como autónomo en España'
      document.head.appendChild(m)
    }
    return () => { document.title = 'Bleak\'s Solutions CRM' }
  }, [])

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--bor2)', background: 'var(--bg2)', padding: '20px 32px', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 4 }}>
          Calculadora Financiera Freelance
        </h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fd)' }}>
          Planifica tu proyecto, impuestos y gastos en tiempo real
        </p>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 48px' }}>
        <FreelanceCalculator
          customers={customers}
          onCreateCustomer={onCreateCustomer}
          onSaveFinanceProject={onSaveFinanceProject}
        />
      </div>
    </div>
  )
}
