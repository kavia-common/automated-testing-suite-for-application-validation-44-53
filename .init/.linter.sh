#!/bin/bash
cd /home/kavia/workspace/code-generation/automated-testing-suite-for-application-validation-44-53/playwright_test_suite_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

