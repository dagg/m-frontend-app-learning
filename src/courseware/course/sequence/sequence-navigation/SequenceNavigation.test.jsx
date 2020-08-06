import React from 'react';
import { Factory } from 'rosie';
import {
  render, screen, fireEvent, getByText, initializeTestStore,
} from '../../../../setupTest';
import SequenceNavigation from './SequenceNavigation';
import useIndexOfLastVisibleChild from '../../../../generic/tabs/useIndexOfLastVisibleChild';

// Mock the hook to avoid relying on its implementation and mocking `getBoundingClientRect`.
jest.mock('../../../../generic/tabs/useIndexOfLastVisibleChild');
useIndexOfLastVisibleChild.mockReturnValue([0, null, null]);

describe('Sequence Navigation', () => {
  let mockData;
  const courseMetadata = Factory.build('courseMetadata');
  const unitBlocks = Array.from({ length: 3 }).map(() => Factory.build(
    'block',
    { type: 'problem' },
    { courseId: courseMetadata.id },
  ));

  beforeAll(async () => {
    const store = await initializeTestStore({ courseMetadata, unitBlocks });
    const { courseware } = store.getState();
    mockData = {
      unitId: unitBlocks[1].id,
      sequenceId: courseware.sequenceId,
      previousSequenceHandler: () => {},
      onNavigate: () => {},
      nextSequenceHandler: () => {},
    };
  });

  it('is empty while loading', async () => {
    const testStore = await initializeTestStore({ excludeFetchSequence: true }, false);
    const { container } = render(<SequenceNavigation {...mockData} />, { store: testStore });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders empty div without unitId', () => {
    const { container } = render(<SequenceNavigation {...mockData} unitId={undefined} />);
    expect(getByText(container, (content, element) => (
      element.tagName.toLowerCase() === 'div' && element.getAttribute('style')))).toBeEmptyDOMElement();
  });

  it('renders locked button for gated content', async () => {
    const sequenceBlock = [Factory.build(
      'block',
      { type: 'sequential', children: [unitBlocks.map(block => block.id)] },
      { courseId: courseMetadata.id },
    )];
    const sequenceMetadata = [Factory.build(
      'sequenceMetadata',
      { gated_content: { gated: true } },
      { courseId: courseMetadata.id, unitBlocks, sequenceBlock: sequenceBlock[0] },
    )];
    const testStore = await initializeTestStore({ unitBlocks, sequenceBlock, sequenceMetadata }, false);
    const testData = {
      ...mockData,
      sequenceId: sequenceBlock[0].id,
      onNavigate: jest.fn(),
    };
    render(<SequenceNavigation {...testData} />, { store: testStore });

    const unitButton = screen.getByTitle(unitBlocks[1].display_name);
    fireEvent.click(unitButton);
    // The unit button should not work for gated content.
    expect(testData.onNavigate).not.toHaveBeenCalled();
    // TODO: Not sure if this is working as expected, because the `contentType="lock"` will be overridden by the value
    //  from Redux. To make this provide a `fa-icon` lock we could introduce something like `overriddenContentType`.
    expect(unitButton.firstChild).toHaveClass('fa-edit');
  });

  it('renders correctly and handles unit button clicks', () => {
    const onNavigate = jest.fn();
    render(<SequenceNavigation {...mockData} {...{ onNavigate }} />);

    const unitButtons = screen.getAllByRole('button', { name: /\d+/ });
    expect(unitButtons).toHaveLength(unitButtons.length);
    unitButtons.forEach(button => fireEvent.click(button));
    expect(onNavigate).toHaveBeenCalledTimes(unitButtons.length);
  });

  it('has both navigation buttons enabled for a non-corner unit of the sequence', () => {
    render(<SequenceNavigation {...mockData} />);

    screen.getAllByRole('button', { name: /previous|next/i }).forEach(button => {
      expect(button).toBeEnabled();
    });
  });

  it('has the "Previous" button disabled for the first unit of the sequence', () => {
    render(<SequenceNavigation {...mockData} unitId={unitBlocks[0].id} />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('has the "Next" button disabled for the last unit of the sequence', () => {
    render(<SequenceNavigation
      {...mockData}
      unitId={unitBlocks[unitBlocks.length - 1].id}
    />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('handles "Previous" and "Next" click', () => {
    const previousSequenceHandler = jest.fn();
    const nextSequenceHandler = jest.fn();
    render(<SequenceNavigation {...mockData} {...{ previousSequenceHandler, nextSequenceHandler }} />);

    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(previousSequenceHandler).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(nextSequenceHandler).toHaveBeenCalledTimes(1);
  });
});