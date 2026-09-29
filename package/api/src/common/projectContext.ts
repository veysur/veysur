import { DataSourceContext } from '@datacapy/om'

export const contextForProject = (projectId: string): DataSourceContext =>
  DataSourceContext.fromDataSources({ project: { lookupKey: projectId } })
