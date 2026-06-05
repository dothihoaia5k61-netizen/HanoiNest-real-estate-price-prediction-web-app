# Hanoi House Price Model Card

Generated at: 2026-06-05T15:31:42.611105+00:00
Dataset: `tinixai/vietnam-real-estates`
Province filter: `Hà Nội`
Selected model: `stacking_ensemble`
Train rows: 61,417
Validation rows: 15,355

## Validation metrics

| Model | RMSE | MAE | R2 | MAPE % |
|---|---:|---:|---:|---:|
| ridge_onehot | 9,702,268,773 | 4,052,563,094 | 0.7524 | 36.17 |
| random_forest | 8,867,446,241 | 3,528,030,656 | 0.7932 | 32.51 |
| hist_gradient_boosting | 8,875,163,832 | 3,886,574,619 | 0.7929 | 34.27 |
| stacking_ensemble | 8,597,938,857 | 3,721,377,205 | 0.8056 | 33.42 |

## Notes

- Target `price` được train qua log1p/expm1 để giảm ảnh hưởng outlier.
- Metrics báo cáo theo đơn vị VND gốc.
- Model artifact không chứa custom sklearn transformer, giúp load dễ hơn trong FastAPI.