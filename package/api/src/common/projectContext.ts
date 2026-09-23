import { DataSourceContext } from 'mzen-om'

export const contextForProject = (projectId: string): DataSourceContext =>
  DataSourceContext.fromDataSources({ project: { lookupKey: projectId } })
