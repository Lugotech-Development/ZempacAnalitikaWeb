import Link from 'next/link';
import { Icon, type IconName } from '@/components/icon';
import { ZempacLogo } from '@/components/common';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <Hero />
      <Customers />
      <Features />
      <ReportsShowcase />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-surface/80 border-b border-surface-mid">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <ZempacLogo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-ink-variant">
          <a href="#caracteristicas" className="hover:text-ink">
            Características
          </a>
          <a href="#reportes" className="hover:text-ink">
            Reportes
          </a>
          <a href="#como-funciona" className="hover:text-ink">
            Cómo funciona
          </a>
        </nav>
        <Link href="/login" className="cta !py-2.5 !px-5 text-sm">
          Iniciar sesión
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary-container/20 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="pill bg-primary/10 text-primary mb-6">
            <Icon name="auto_awesome" size={12} className="mr-1" /> Plataforma Empresarial
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.05]">
            Reportes que <span className="text-primary">impulsan</span> tu negocio.
          </h1>
          <p className="mt-6 text-lg text-ink-variant leading-relaxed max-w-xl">
            Zempac Analitika centraliza tus ventas, devoluciones, productos y cuadres de caja en una sola plataforma. Decisiones más rápidas, con datos en tiempo real desde cualquier sucursal.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/login" className="cta">
              Acceder a mi panel
              <Icon name="arrow_forward" size={16} />
            </Link>
            <a href="#reportes" className="inline-flex items-center gap-2 text-sm font-bold text-ink hover:text-primary transition">
              Ver reportes incluidos
              <Icon name="arrow_forward" size={14} />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-ink-variant">
            {['Sin instalaciones', 'Datos en vivo', 'Multi-sucursal'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-primary" />
                <span className="font-semibold">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="card p-6 rotate-1">
        <div className="rounded-2xl bg-primary-gradient p-6 text-white">
          <p className="text-[11px] font-bold tracking-eyebrow uppercase opacity-80">Ventas Mes Actual</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">$2,208,339.46</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="pill bg-white/20 text-white">↑ 8.27%</span>
            <span className="text-xs opacity-80">vs mes anterior</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { l: 'Facturas', v: '3,235' },
            { l: 'Ticket Promedio', v: '$682.64' },
            { l: 'Clientes', v: '619' },
            { l: 'Unidades', v: '13,548' }
          ].map(x => (
            <div key={x.l} className="rounded-2xl bg-surface-low p-3">
              <p className="eyebrow">{x.l}</p>
              <p className="mt-1 text-lg font-extrabold">{x.v}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-6 -left-6 card-bordered p-4 w-56 -rotate-3 hidden sm:block">
        <p className="eyebrow text-primary">Top Producto</p>
        <p className="mt-1 text-sm font-bold leading-snug">CLARO $100 RECARGA ELECTRÓNICA</p>
        <div className="mt-2 h-1.5 rounded-pill bg-surface-mid overflow-hidden">
          <div className="h-full w-[90%] bg-cta-gradient" />
        </div>
        <p className="mt-2 text-xs text-ink-variant">10,917 unidades</p>
      </div>
    </div>
  );
}

function Customers() {
  const clients = [
    { name: 'LugoTech', initials: 'LT', color: 'from-[#0040DF] to-[#2D5BFF]' },
    { name: 'VIP Mendo', initials: 'VM', color: 'from-[#4959A3] to-[#9FAFFF]' },
    { name: 'Distribuidora El Sol', initials: 'ES', color: 'from-[#993100] to-[#C24100]' },
    { name: 'Comercial Unión', initials: 'CU', color: 'from-[#0F766E] to-[#14B8A6]' },
    { name: 'Mayorista Centro', initials: 'MC', color: 'from-[#7E22CE] to-[#A855F7]' },
    { name: 'Grupo Hor-Bel', initials: 'GH', color: 'from-[#B45309] to-[#F59E0B]' }
  ];
  return (
    <section className="border-y border-surface-mid bg-surface-lowest">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="eyebrow text-center text-outline">Empresas que confían en Zempac Analitika</p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {clients.map(c => (
            <div key={c.name} className="flex items-center gap-3 rounded-2xl border border-surface-mid bg-surface px-4 py-3 transition hover:border-surface-high">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.color} text-white flex items-center justify-center text-sm font-extrabold shrink-0`}>{c.initials}</div>
              <span className="text-sm font-bold text-ink truncate">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items: { icon: IconName; title: string; desc: string }[] = [
    {
      icon: 'show_chart',
      title: 'Tendencias en tiempo real',
      desc: 'Compara ventas, facturación y ticket promedio entre periodos con un vistazo.'
    },
    {
      icon: 'bar_chart',
      title: 'Visualización inteligente',
      desc: 'Gráficas claras por día, sucursal y producto, listas para decisiones.'
    },
    {
      icon: 'verified_user',
      title: 'Acceso seguro',
      desc: 'Autenticación por empresa, sesiones persistentes y control por rol.'
    },
    {
      icon: 'smartphone',
      title: 'Móvil + Web',
      desc: 'Llevá tus reportes contigo en la app de Zempac y en este panel web.'
    }
  ];
  return (
    <section id="caracteristicas" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="eyebrow text-primary">Por qué Zempac Analitika</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Todo lo que tu equipo de operaciones necesita.</h2>
        <p className="mt-4 text-ink-variant">
          Diseñado junto a empresas que viven día a día la facturación, las devoluciones y el cuadre de caja. Cada métrica está pensada para que actúes, no solo para que mires.
        </p>
      </div>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map(({ icon, title, desc }) => (
          <div key={title} className="card-bordered p-6">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name={icon} size={20} />
            </div>
            <h3 className="mt-5 text-base font-bold">{title}</h3>
            <p className="mt-2 text-sm text-ink-variant leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportsShowcase() {
  const reports: { icon: IconName; title: string; desc: string }[] = [
    {
      icon: 'grid_view',
      title: 'Pantalla Principal',
      desc: 'Resumen ejecutivo: ventas del mes, facturas, ticket promedio, clientes, unidades, márgenes y devoluciones.'
    },
    {
      icon: 'show_chart',
      title: 'Ventas',
      desc: 'Detalle diario por sucursal, gráfica comparativa y agrupación por almacén.'
    },
    {
      icon: 'keyboard_return',
      title: 'Devoluciones',
      desc: 'Motivos, montos y notas de crédito asociadas, con seguimiento por sucursal.'
    },
    {
      icon: 'shopping_bag',
      title: 'Productos más vendidos',
      desc: 'Ranking de productos con cantidades, margen estimado y participación en facturación.'
    },
    {
      icon: 'point_of_sale',
      title: 'Cuadre de caja',
      desc: 'Conciliación diaria por almacén con saldos esperados vs. recibidos.'
    }
  ];
  return (
    <section id="reportes" className="bg-surface-lowest border-y border-surface-mid">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow text-primary">Reportes incluidos</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Los datos que ya conoces, en una experiencia moderna.</h2>
          </div>
          <Link href="/login" className="cta !py-2.5 !px-5 text-sm">
            Entrar al panel
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map(({ icon, title, desc }) => (
            <div key={title} className="card-bordered p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-gradient text-white flex items-center justify-center">
                  <Icon name={icon} size={18} />
                </div>
                <h3 className="text-base font-bold">{title}</h3>
              </div>
              <p className="mt-4 text-sm text-ink-variant leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: { icon: IconName; title: string; desc: string }[] = [
    {
      icon: 'power',
      title: 'Conectamos tus datos',
      desc: 'Enlazamos Zempac Analitika con tu sistema de facturación e inventario en cuestión de horas. Sin migraciones largas ni dolor de cabeza para tu equipo de TI.'
    },
    {
      icon: 'show_chart',
      title: 'Visualizamos en tiempo real',
      desc: 'Cada venta, devolución y cierre de caja se refleja al instante en gráficas claras, listas para mirar desde la oficina o desde el celular.'
    },
    {
      icon: 'gps_fixed',
      title: 'Decides con confianza',
      desc: 'Compara mes contra mes, sucursal contra sucursal, producto contra producto, y actúa con datos en lugar de corazonadas.'
    }
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center max-w-2xl mx-auto">
        <p className="eyebrow text-primary">Cómo funciona</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight">De tus datos crudos a decisiones, en tres pasos.</h2>
        <p className="mt-4 text-ink-variant">Diseñado para que cualquier persona del equipo pueda leerlo, no solo el área de finanzas.</p>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {steps.map(({ icon, title, desc }, i) => (
          <div key={title} className="card-bordered p-7 relative">
            <span className="absolute top-5 right-5 text-5xl font-extrabold text-surface-mid leading-none select-none">0{i + 1}</span>
            <div className="h-12 w-12 rounded-2xl bg-primary-gradient text-white flex items-center justify-center">
              <Icon name={icon} size={20} />
            </div>
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm text-ink-variant leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// NOTE: Pricing section is kept here for future use. Currently rendered as
// HowItWorks instead. To restore it, swap <HowItWorks /> for <Pricing /> in
// LandingPage and update the header nav anchor back to '#precios'.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Pricing() {
  const plans = [
    {
      name: 'Esencial',
      price: '$29',
      desc: 'Para una sola sucursal que empieza con analítica.',
      features: ['Reportes diarios y mensuales', '1 sucursal', 'Hasta 3 usuarios', 'Soporte por correo'],
      featured: false
    },
    {
      name: 'Empresarial',
      price: '$89',
      desc: 'Multi-sucursal, ideal para cadenas y mayoristas.',
      features: ['Todos los reportes', 'Sucursales ilimitadas', 'Usuarios ilimitados', 'Soporte prioritario', 'Acceso desde la app móvil'],
      featured: true
    },
    {
      name: 'Corporativo',
      price: 'A medida',
      desc: 'Integración con tu ERP, SLAs y soporte dedicado.',
      features: ['Todo lo del plan Empresarial', 'Integraciones personalizadas', 'Onboarding asistido', 'Gestor de cuenta'],
      featured: false
    }
  ];
  return (
    <section id="precios" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center max-w-2xl mx-auto">
        <p className="eyebrow text-primary">Precios</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Planes simples para empresas que crecen.</h2>
        <p className="mt-4 text-ink-variant">Sin contratos largos. Cambia o cancela cuando quieras.</p>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {plans.map(p => (
          <div key={p.name} className={`card-bordered p-8 flex flex-col ${p.featured ? 'border-primary/30 shadow-cta ring-1 ring-primary/20' : ''}`}>
            {p.featured && <span className="pill self-start bg-primary text-white mb-4">Más popular</span>}
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-ink-variant">{p.desc}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
              {p.price.startsWith('$') && <span className="text-sm text-ink-variant">/ mes</span>}
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Icon name="check" size={16} className="mt-0.5 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className={`mt-8 inline-flex items-center justify-center rounded-pill px-5 py-3 text-sm font-bold transition ${
                p.featured ? 'bg-cta-gradient text-white shadow-cta hover:brightness-110' : 'bg-surface-low text-ink hover:bg-surface-mid'
              }`}>
              Iniciar sesión
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="rounded-card bg-primary-gradient p-10 sm:p-14 text-white flex flex-col lg:flex-row lg:items-center gap-8 lg:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">¿Listo para ver tus reportes con claridad?</h3>
          <p className="mt-3 text-white/85">Accede a tu panel y descubre lo que tus datos pueden contarte hoy.</p>
        </div>
        <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-pill bg-white px-7 py-4 text-sm font-bold text-primary hover:bg-white/90 transition">
          Iniciar sesión
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-surface-mid bg-surface-lowest">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <ZempacLogo size={28} />
        <p className="text-xs text-ink-variant">© {new Date().getFullYear()} Zempac Analitika. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
