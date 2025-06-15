'use client';

import { Providers } from '../components/providers';
import { SafeRootWrapper } from '../components/error-boundaries/SafeRootWrapper';
import { TemplateContent } from '../components/template-content';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <SafeRootWrapper>
      <Providers>
        <TemplateContent>{children}</TemplateContent>
      </Providers>
    </SafeRootWrapper>
  );
}
