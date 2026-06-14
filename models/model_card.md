# Hanoi House Price Model Card

Generated at: 2026-06-08T10:32:15.443269+00:00
Dataset: `tinixai/vietnam-real-estates`
Province filter: `Hà Nội`
Selected model: `random_forest`
Train rows: 61,417
Validation rows: 15,355

## Validation metrics

| Model | RMSE | MAE | R2 | MAPE % |
|---|---:|---:|---:|---:|
| ridge_onehot | 9,702,356,996 | 4,052,583,826 | 0.7524 | 36.17 |
| random_forest | 8,867,446,241 | 3,528,030,656 | 0.7932 | 32.51 |
| hist_gradient_boosting | 8,875,163,832 | 3,886,574,619 | 0.7929 | 34.27 |
| stacking_ensemble | error | error | error | error |

## Notes

- Target `price` được train qua log1p/expm1 để giảm ảnh hưởng outlier.
- Metrics báo cáo theo đơn vị VND gốc.
- Model artifact không chứa custom sklearn transformer, giúp load dễ hơn trong FastAPI.