#ifndef QTAIAPP_H
#define QTAIAPP_H

#include <QObject>
#include <QString>

class QtAiApp : public QObject
{
    Q_OBJECT
public:
    explicit QtAiApp(QObject *parent = nullptr);

    // Invokable function to run AI inference from the mobile screen
    Q_INVOKABLE QString runInference(const QString &inputData);
};

#endif // QTAIAPP_H
