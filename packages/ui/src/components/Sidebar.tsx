import type { ElementType, ReactNode } from 'react';

export type SidebarItem = { href: string; label: string; icon?: ReactNode; badge?: ReactNode; exact?: boolean };
export type SidebarSection = { title?: string; items: SidebarItem[] };

function isActive(item: SidebarItem, activePath: string): boolean {
  if (activePath === item.href) return true;
  return !item.exact && activePath.startsWith(`${item.href}/`);
}

export function Sidebar({ header, sections, footer, activePath = '', LinkComponent = 'a' }: {
  header?: ReactNode;
  sections: SidebarSection[];
  footer?: ReactNode;
  activePath?: string;
  LinkComponent?: ElementType;
}) {
  return (
    <nav aria-label="워크스페이스" className="cl-sidebar">
      {header}
      {sections.map((section, index) => (
        <div className="cl-sidebar__section" key={section.title ?? index}>
          {section.title && <p className="cl-sidebar__section-title">{section.title}</p>}
          {section.items.map((item) => (
            <LinkComponent
              aria-current={isActive(item, activePath) ? 'page' : undefined}
              className="cl-sidebar__item"
              href={item.href}
              key={item.href}
            >
              {item.icon}
              {item.label}
              {item.badge && <span className="cl-sidebar__badge">{item.badge}</span>}
            </LinkComponent>
          ))}
        </div>
      ))}
      {footer && <div className="cl-sidebar__footer">{footer}</div>}
    </nav>
  );
}
