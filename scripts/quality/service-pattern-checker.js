#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PATTERNS = {
  // Service layer patterns
  serviceResponse: /ServiceResponse</,
  zodValidation: /\.parse\(|\.safeParse\(/,
  serviceExport: /export\s+const\s+\w+Service\s*=/,

  // Anti-patterns
  directSupabase: /supabase\./,
  useEffectFetch: /useEffect[\s\S]*?fetch|useEffect[\s\S]*?getData/,
  componentQuery: /from\(['"`][\w_]+['"`]\)/,

  // Query patterns
  tanstackQuery: /useQuery|useMutation/,
  queryKey: /queryKey:\s*\[/,
  queryFn: /queryFn:/,
  staleTime: /staleTime:/,
};

async function checkServiceLayer(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  // Skip certain utility files
  const utilityFiles = ['index.ts', 'types.ts', 'constants.ts', 'utils.ts'];
  const fileName = path.basename(filePath);
  if (utilityFiles.includes(fileName)) {
    return violations;
  }

  // Skip realtime/presence services as they have different patterns
  if (filePath.includes('presence') || filePath.includes('realtime')) {
    return violations;
  }

  // Check if this is a data service (has database operations)
  const hasDataOperations =
    content.includes('supabase') ||
    content.includes('from(') ||
    content.includes('select(') ||
    content.includes('insert(') ||
    content.includes('update(') ||
    content.includes('delete(');

  // Only check for ServiceResponse if this is a data service
  if (hasDataOperations && !PATTERNS.serviceResponse.test(content)) {
    violations.push({
      file: filePath,
      type: 'missing-service-response',
      message: 'Service should return ServiceResponse<T>',
      fix: 'Return { success: true, data } or { success: false, error }',
    });
  }

  // Only check for Zod validation if there are function parameters
  const hasFunctionParams =
    /\((.*?)\)/.test(content) && !/\(\s*\)/.test(content); // Not empty params

  if (
    hasDataOperations &&
    hasFunctionParams &&
    !PATTERNS.zodValidation.test(content)
  ) {
    violations.push({
      file: filePath,
      type: 'missing-validation',
      message: 'No Zod validation found',
      fix: 'Add schema.parse() or schema.safeParse() for input validation',
    });
  }

  return violations;
}

async function checkComponentLayer(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  const lines = content.split('\n');

  // Check for direct Supabase calls
  lines.forEach((line, index) => {
    if (
      PATTERNS.directSupabase.test(line) &&
      !line.includes('//') &&
      !line.includes('import')
    ) {
      violations.push({
        file: filePath,
        line: index + 1,
        type: 'direct-supabase',
        message: 'Direct Supabase call in component',
        code: line.trim(),
        fix: 'Move to service layer and use TanStack Query',
      });
    }

    // Check for useEffect data fetching
    if (PATTERNS.useEffectFetch.test(line)) {
      violations.push({
        file: filePath,
        line: index + 1,
        type: 'useeffect-fetch',
        message: 'Data fetching in useEffect',
        code: line.trim(),
        fix: 'Use TanStack Query instead',
      });
    }
  });

  // Check for component-level queries
  if (PATTERNS.componentQuery.test(content) && !filePath.includes('service')) {
    violations.push({
      file: filePath,
      type: 'component-query',
      message: 'Database query in component',
      fix: 'Move query to service layer',
    });
  }

  return violations;
}

async function checkQueryLayer(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  // Check for proper TanStack Query usage
  if (PATTERNS.tanstackQuery.test(content)) {
    if (!PATTERNS.queryKey.test(content)) {
      violations.push({
        file: filePath,
        type: 'missing-query-key',
        message: 'Missing queryKey in useQuery',
        fix: 'Add queryKey: ["resource", params]',
      });
    }

    if (!PATTERNS.staleTime.test(content)) {
      violations.push({
        file: filePath,
        type: 'missing-stale-time',
        message: 'Consider adding staleTime to reduce refetches',
        fix: 'Add staleTime: 5 * 60 * 1000 // 5 minutes',
      });
    }
  }

  return violations;
}

async function main() {
  console.log('🔍 Service Architecture Pattern Checker...\n');

  // Get all relevant files
  const serviceFiles = await new Promise((resolve, reject) => {
    glob(
      'src/services/**/*.{ts,tsx}',
      {
        ignore: ['**/node_modules/**'],
      },
      (err, files) => {
        if (err) reject(err);
        else resolve(files);
      }
    );
  });

  const componentFiles = await new Promise((resolve, reject) => {
    glob(
      'src/**/*.{tsx}',
      {
        ignore: ['**/node_modules/**', '**/services/**'],
      },
      (err, files) => {
        if (err) reject(err);
        else resolve(files);
      }
    );
  });

  let totalViolations = 0;
  const allViolations = [];

  // Check service files
  console.log('📁 Checking service layer...');
  for (const file of serviceFiles) {
    const violations = await checkServiceLayer(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      allViolations.push(...violations);
    }
  }

  // Check component files
  console.log('📁 Checking component layer...');
  for (const file of componentFiles) {
    const violations = await checkComponentLayer(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      allViolations.push(...violations);
    }
  }

  // Check for query patterns
  console.log('📁 Checking query patterns...');
  for (const file of componentFiles) {
    const violations = await checkQueryLayer(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      allViolations.push(...violations);
    }
  }

  // Group violations by type
  const violationsByType = allViolations.reduce((acc, v) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  // Display results
  if (totalViolations === 0) {
    console.log(
      '\n✅ No architecture violations found! Service → Query → Component pattern intact! 🎉'
    );
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${totalViolations} architecture violations:\n`);

    Object.entries(violationsByType).forEach(([type, violations]) => {
      console.log(
        `\n📋 ${type.replace(/-/g, ' ').toUpperCase()} (${violations.length} violations):`
      );
      violations.slice(0, 5).forEach(v => {
        console.log(`   ${v.file}${v.line ? ':' + v.line : ''}`);
        console.log(`   ${v.message}`);
        if (v.code) console.log(`   > ${v.code}`);
        if (v.fix) console.log(`   Fix: ${v.fix}`);
        console.log('');
      });
      if (violations.length > 5) {
        console.log(`   ... and ${violations.length - 5} more\n`);
      }
    });

    // Show correct pattern example
    console.log('\n📝 Correct Architecture Pattern:\n');
    console.log('1️⃣ Service Layer (services/my-service.ts):');
    console.log(`
export const myService = {
  async getData(id: string): Promise<ServiceResponse<Data>> {
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false, error: 'Invalid ID' };
    }
    
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('id', parsed.data);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  }
};`);

    console.log('\n2️⃣ Query Hook (hooks/use-my-data.ts):');
    console.log(`
export const useMyData = (id: string) => {
  return useQuery({
    queryKey: ['my-data', id],
    queryFn: () => myService.getData(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (res) => res.success ? res.data : null
  });
};`);

    console.log('\n3️⃣ Component (components/my-component.tsx):');
    console.log(`
export function MyComponent({ id }: Props) {
  const { data, isLoading, error } = useMyData(id);
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return <div>{data.name}</div>;
}`);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      totalViolations,
      violationsByType: Object.entries(violationsByType).map(
        ([type, violations]) => ({
          type,
          count: violations.length,
          violations: violations.slice(0, 10),
        })
      ),
    };

    fs.writeFileSync(
      path.join(__dirname, 'architecture-violations-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(
      '\n📊 Full report saved to scripts/architecture-violations-report.json'
    );

    process.exit(1);
  }
}

main().catch(console.error);
