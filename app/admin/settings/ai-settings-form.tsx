'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  updateAiBaseUrl,
  updateAiEnabled,
  updateAiModel,
} from '@/lib/actions/settings.actions';

const AiSettingsForm = ({
  initialModel,
  initialBaseUrl,
  initialEnabled,
  hasKey,
}: {
  initialModel: string;
  initialBaseUrl: string;
  initialEnabled: boolean;
  /** Whether AI_API_KEY exists in the environment (read-only hint) */
  hasKey: boolean;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [model, setModel] = useState(initialModel);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const [enabledRes, modelRes, urlRes] = await Promise.all([
        updateAiEnabled(enabled),
        updateAiModel(model),
        updateAiBaseUrl(baseUrl),
      ]);
      const failed = [enabledRes, modelRes, urlRes].find((r) => !r.success);
      if (failed) {
        toast.error(failed.message);
      } else {
        toast.success(modelRes.message);
      }
    });
  };

  return (
    <div className='max-w-2xl space-y-4'>
      <h1 className='h2-bold'>{t('aiSettingsTitle')}</h1>

      <Card>
        <CardContent className='p-4'>
          <FieldGroup>
            <Label className='flex items-center gap-2 text-sm font-normal'>
              <Checkbox
                checked={enabled}
                onCheckedChange={(c) => setEnabled(c === true)}
              />
              {t('aiEnabled')}
            </Label>
            <FieldDescription>{t('aiEnabledHint')}</FieldDescription>

            <Field>
              <FieldLabel htmlFor='ai-model'>{t('aiModelLabel')}</FieldLabel>
              <Input
                id='ai-model'
                value={model}
                onChange={(e) => setModel(e.target.value)}
                dir='ltr'
                maxLength={80}
                placeholder='llama-3.3-70b-versatile'
              />
              <FieldDescription>{t('aiModelHint')}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor='ai-baseurl'>{t('aiBaseUrlLabel')}</FieldLabel>
              <Input
                id='ai-baseurl'
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                dir='ltr'
                placeholder='http://localhost:9router/v1'
              />
              <FieldDescription>{t('aiBaseUrlHint')}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>{t('aiKeyStatus')}</FieldLabel>
              <FieldDescription
                className={hasKey ? 'text-green-600 dark:text-green-400' : 'text-destructive'}
              >
                {hasKey ? t('aiKeySet') : t('aiKeyMissing')}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <Button onClick={save} disabled={isPending} className='mt-4'>
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Save className='h-4 w-4' />
            )}
            {tCommon('save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiSettingsForm;
