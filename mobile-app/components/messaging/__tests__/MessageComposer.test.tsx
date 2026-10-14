import React from 'react';
import { TouchableOpacity } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { MessageComposer } from '../MessageComposer';

it('retains the draft after a rejected send', async () => {
  const view = render(<MessageComposer onSend={async () => false} />);
  fireEvent.changeText(view.getByLabelText('Message'), 'Please check the pickup');
  await act(async () => { fireEvent.press(view.getByLabelText('Send message')); });
  expect(view.getByLabelText('Message').props.value).toBe('Please check the pickup');
});

it('prevents two same-frame submissions before React updates the button', async () => {
  let complete!: () => void;
  const onSend = jest.fn(() => new Promise<void>(resolve => { complete = resolve; }));
  const view = render(<MessageComposer onSend={onSend} />);
  fireEvent.changeText(view.getByLabelText('Message'), 'Delivery update');
  const press = view.UNSAFE_getByType(TouchableOpacity).props.onPress;
  await act(async () => { void press(); void press(); });
  expect(onSend).toHaveBeenCalledTimes(1);
  await act(async () => { complete(); });
  expect(view.getByLabelText('Message').props.value).toBe('');
});
