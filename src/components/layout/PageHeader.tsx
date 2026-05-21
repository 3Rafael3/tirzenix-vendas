interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-3xl lg:text-[2.5rem] leading-[1.05] font-bold tracking-tight-display text-silver-50">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-silver-400 mt-2 max-w-xl tracking-tight">{subtitle}</p>
        )}
        <div className="mt-3 h-px w-16 bg-gold-gradient rounded-full" />
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
