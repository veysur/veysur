import { TaskExecution } from './TaskExecution'

describe('TaskExecution', () => {
  it('fills defaults from the schema shape', () => {
    const execution = new TaskExecution()
    expect(execution).toMatchObject({
      _id: '',
      status: 'running',
      stoppedAt: null,
      duration: null,
      log: null,
    })
    expect(execution.startedAt).toBeInstanceOf(Date)
    expect(execution.createdAt).toBeInstanceOf(Date)
  })

  it('keeps given values, including a zero duration', () => {
    const execution = new TaskExecution({
      taskId: 't1',
      status: 'completed',
      duration: 0,
    })
    expect(execution).toMatchObject({
      taskId: 't1',
      status: 'completed',
      duration: 0,
    })
  })
})
