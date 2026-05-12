import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupedIssueRow } from '../GroupedIssueRow';
import { groupIssues, type GroupableIssue } from '../group-issues';

function issue(over: Partial<GroupableIssue>): GroupableIssue {
  return {
    id: Math.random().toString(36).slice(2),
    code: 'PRH-MARKUP-DEPRECATED-TAG',
    severity: 'moderate',
    message: 'Deprecated <b> tag — use <strong>.',
    location: 'OEBPS/Text/c1.xhtml',
    source: 'prh-uk',
    ...over,
  };
}

function renderGroup(issues: GroupableIssue[]) {
  const [entry] = groupIssues(issues);
  if (entry.kind !== 'group') throw new Error('expected a grouped entry');
  return render(
    <GroupedIssueRow
      entry={entry}
      renderIssue={(i) => <p data-testid={`stub-${i.id}`}>{i.message}</p>}
    />,
  );
}

describe('GroupedIssueRow', () => {
  const issues = [
    issue({ id: 'a', location: 'OEBPS/Text/c1.xhtml#L10' }),
    issue({ id: 'b', location: 'OEBPS/Text/c1.xhtml#L42' }),
    issue({ id: 'c', location: 'OEBPS/Text/c2.xhtml#L7' }),
  ];

  it('renders the code, instance count, and file count in the header', () => {
    renderGroup(issues);
    const header = screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG');
    expect(header).toHaveTextContent('PRH-MARKUP-DEPRECATED-TAG');
    expect(header).toHaveTextContent('3');
    expect(header).toHaveTextContent(/instances across/);
    expect(header).toHaveTextContent('2');
    expect(header).toHaveTextContent(/files/);
  });

  it('starts collapsed by default — file sub-rows are not rendered', () => {
    renderGroup(issues);
    expect(screen.queryByText('OEBPS/Text/c1.xhtml')).not.toBeInTheDocument();
    expect(screen.queryByText('OEBPS/Text/c2.xhtml')).not.toBeInTheDocument();
  });

  it('expands the group on header click and reveals per-file sub-rows in source order', async () => {
    renderGroup(issues);
    const header = screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG');
    expect(header).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');

    const file1 = screen.getByTestId(
      'issue-group-PRH-MARKUP-DEPRECATED-TAG-file-OEBPS/Text/c1.xhtml',
    );
    const file2 = screen.getByTestId(
      'issue-group-PRH-MARKUP-DEPRECATED-TAG-file-OEBPS/Text/c2.xhtml',
    );
    expect(file1).toBeInTheDocument();
    expect(file2).toBeInTheDocument();
    expect(file1).toHaveTextContent('2 instances');
    expect(file2).toHaveTextContent('1 instance');
  });

  it('expands a file sub-row on click and renders its issues via the render-prop', async () => {
    renderGroup(issues);
    await userEvent.click(screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG'));
    const file1 = screen.getByTestId(
      'issue-group-PRH-MARKUP-DEPRECATED-TAG-file-OEBPS/Text/c1.xhtml',
    );

    expect(screen.queryByTestId('stub-a')).not.toBeInTheDocument();
    await userEvent.click(file1);
    expect(screen.getByTestId('stub-a')).toBeInTheDocument();
    expect(screen.getByTestId('stub-b')).toBeInTheDocument();
    // Instances from the *other* file remain hidden — only the expanded
    // file's sub-rows render their underlying issues.
    expect(screen.queryByTestId('stub-c')).not.toBeInTheDocument();
  });

  it('renders the (no location) bucket for issues with missing locations', async () => {
    const mixed = [
      issue({ id: 'x', location: undefined }),
      issue({ id: 'y', location: 'OEBPS/Text/c1.xhtml' }),
    ];
    renderGroup(mixed);
    await userEvent.click(screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG'));
    expect(
      screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG-file-(no location)'),
    ).toBeInTheDocument();
  });

  it('respects defaultExpanded by skipping the initial collapsed state', () => {
    const [entry] = groupIssues(issues);
    if (entry.kind !== 'group') throw new Error('expected group');
    render(
      <GroupedIssueRow
        entry={entry}
        renderIssue={(i) => <p>{i.message}</p>}
        defaultExpanded
      />,
    );
    const header = screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG');
    expect(header).toHaveAttribute('aria-expanded', 'true');
    // File rows are visible without any click.
    expect(
      screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG-file-OEBPS/Text/c1.xhtml'),
    ).toBeInTheDocument();
  });

  it('does not call renderIssue until a file sub-row is expanded', async () => {
    const renderIssue = vi.fn().mockReturnValue(null);
    const [entry] = groupIssues(issues);
    if (entry.kind !== 'group') throw new Error('expected group');
    render(<GroupedIssueRow entry={entry} renderIssue={renderIssue} />);
    expect(renderIssue).not.toHaveBeenCalled();

    // Expanding the group alone should NOT render issues (file rows still collapsed).
    await userEvent.click(screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG'));
    expect(renderIssue).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByTestId('issue-group-PRH-MARKUP-DEPRECATED-TAG-file-OEBPS/Text/c1.xhtml'),
    );
    // c1.xhtml has 2 issues — renderIssue called for each.
    expect(renderIssue).toHaveBeenCalledTimes(2);
  });
});
